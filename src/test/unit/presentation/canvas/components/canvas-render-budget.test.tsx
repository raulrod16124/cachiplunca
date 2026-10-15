import { act, render } from '@testing-library/react';
import {
  Bounds,
  ElementId,
  Position,
  Size,
  UserId,
  WorkspaceId,
} from '../../../../../domain/shared';
import { createTextElement } from '../../../../../domain/element';
import type { Element } from '../../../../../domain/element';
import {
  createCanvasViewportStore,
  createSelectionStore,
  getVisibleElementIds,
  toSelectableItems,
} from '../../../../../application/services';
import type { CanvasViewportStore } from '../../../../../application/services';
import { CULLING_MARGIN, Canvas } from '../../../../../presentation/canvas/components/canvas';
import { generateElements } from '../../../../fixtures/generate-elements';

/**
 * Deterministic performance-regression guard for the TASK-114 optimization.
 *
 * TASK-113 found that pan/zoom/selection re-rendered *every* element, so the
 * fix (TASK-114) culls the mounted `ElementView`s to the visible world area.
 * This suite asserts that structural contract instead of wall-clock time: it is
 * machine-independent, so it fails reliably (in `npm test`) whenever the culling
 * is removed or degraded, without the flakiness of timing budgets.
 */

const VIEWPORT = Size.create(1280, 800);

function createElement(id: string, x: number, y: number): Element {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(x, y),
    size: Size.create(50, 50),
    content: id,
  });
}

function mountedElementCount(container: HTMLElement): number {
  return container.querySelectorAll('[data-selectable]').length;
}

/**
 * Mirrors the visible-world computation in `canvas.tsx` (jsdom does no layout,
 * so the hook falls back to `viewport.size`, which is exactly `VIEWPORT` here).
 */
function expectedVisibleCount(
  elements: readonly Element[],
  store: CanvasViewportStore,
  size: Size,
): number {
  const viewport = store.getSnapshot();
  const topLeft = viewport.screenToWorld(Position.create(0, 0));
  const bottomRight = viewport.screenToWorld(Position.create(size.width, size.height));
  const visibleWorld = Bounds.fromXYWH(
    topLeft.x,
    topLeft.y,
    bottomRight.x - topLeft.x,
    bottomRight.y - topLeft.y,
  );

  return getVisibleElementIds(toSelectableItems(elements), visibleWorld, CULLING_MARGIN).length;
}

function renderCanvas(elements: readonly Element[]) {
  const store = createCanvasViewportStore(VIEWPORT);
  const selectionStore = createSelectionStore();
  const view = render(<Canvas store={store} selectionStore={selectionStore} elements={elements} />);

  return { store, selectionStore, container: view.container };
}

describe('Canvas render budget (performance regression)', () => {
  it('mounts exactly the elements intersecting the visible world, far fewer than N', () => {
    const elements = generateElements({ count: 8000 });
    const { store, container } = renderCanvas(elements);

    const expected = expectedVisibleCount(elements, store, VIEWPORT);
    const mounted = mountedElementCount(container);

    expect(expected).toBeGreaterThan(0);
    expect(expected).toBeLessThan(elements.length / 10);
    expect(mounted).toBe(expected);
  });

  it('keeps the mounted count independent of board size', () => {
    const visible = [createElement('near-1', 10, 10), createElement('near-2', 120, 10)];

    function farElements(count: number, offset: number): readonly Element[] {
      return Array.from({ length: count }, (_, index) =>
        createElement(`far-${offset + index}`, 1_000_000 + index, 1_000_000),
      );
    }

    const smallBoard = [...visible, ...farElements(10, 0)];
    const largeBoard = [...visible, ...farElements(5000, 10)];

    const small = renderCanvas(smallBoard);
    const large = renderCanvas(largeBoard);

    expect(mountedElementCount(small.container)).toBe(visible.length);
    expect(mountedElementCount(large.container)).toBe(visible.length);
  });

  it('does not mount culled elements after pan, zoom or selection', () => {
    const elements = generateElements({ count: 8000 });
    const { store, selectionStore, container } = renderCanvas(elements);

    act(() => {
      store.pan(Position.create(120, 80));
    });
    expect(mountedElementCount(container)).toBe(expectedVisibleCount(elements, store, VIEWPORT));

    act(() => {
      store.zoom(0.5, Position.create(VIEWPORT.width / 2, VIEWPORT.height / 2));
    });
    expect(mountedElementCount(container)).toBe(expectedVisibleCount(elements, store, VIEWPORT));

    act(() => {
      selectionStore.selectMany(elements.slice(0, 10).map((element) => element.id.value));
    });
    const mountedAfterSelection = mountedElementCount(container);
    expect(mountedAfterSelection).toBe(expectedVisibleCount(elements, store, VIEWPORT));
    expect(mountedAfterSelection).toBeLessThan(elements.length / 10);
  });

  it('mounts nothing when the viewport is panned away from every element', () => {
    const elements = generateElements({ count: 2000 });
    const { store, container } = renderCanvas(elements);

    act(() => {
      store.pan(Position.create(-1_000_000, -1_000_000));
    });

    expect(mountedElementCount(container)).toBe(0);
  });
});
