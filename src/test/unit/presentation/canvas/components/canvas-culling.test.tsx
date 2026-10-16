import { act, render, screen } from '@testing-library/react';
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
} from '../../../../../application/services';
import { Canvas } from '../../../../../presentation/canvas/components/canvas';

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

const VISIBLE = createElement('visible', 10, 10);
const OFFSCREEN = createElement('offscreen', 1000, 1000);

function renderCanvas(elements: readonly Element[]) {
  const store = createCanvasViewportStore(Size.create(200, 200));
  const selectionStore = createSelectionStore();

  render(<Canvas store={store} selectionStore={selectionStore} elements={elements} />);

  return { store, selectionStore };
}

describe('Canvas viewport culling', () => {
  it('renders only elements intersecting the visible viewport', () => {
    renderCanvas([VISIBLE, OFFSCREEN]);

    expect(screen.getByTestId('canvas-item-visible')).toBeInTheDocument();
    expect(screen.queryByTestId('canvas-item-offscreen')).not.toBeInTheDocument();
  });

  it('renders an element once it is panned into view', () => {
    const { store } = renderCanvas([VISIBLE, OFFSCREEN]);

    expect(screen.queryByTestId('canvas-item-offscreen')).not.toBeInTheDocument();

    act(() => {
      store.fit(Bounds.fromXYWH(1000, 1000, 50, 50));
    });

    expect(screen.getByTestId('canvas-item-offscreen')).toBeInTheDocument();
  });

  it('keeps hit-testing against every element, including culled ones', () => {
    const { selectionStore } = renderCanvas([VISIBLE, OFFSCREEN]);

    expect(screen.queryByTestId('canvas-item-offscreen')).not.toBeInTheDocument();

    act(() => {
      selectionStore.select(OFFSCREEN.id.value);
    });

    expect(selectionStore.getSnapshot().selectedIds).toEqual([OFFSCREEN.id.value]);
  });
});
