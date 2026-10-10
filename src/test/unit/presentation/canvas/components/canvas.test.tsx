import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Position, ElementId, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import { createTextElement } from '../../../../../domain/element';
import type { Element } from '../../../../../domain/element';
import {
  createCanvasViewportStore,
  createSelectionStore,
} from '../../../../../application/services';
import { Canvas } from '../../../../../presentation/canvas/components/canvas';

function createElement(id: string, x: number, y: number, width: number, height: number): Element {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(x, y),
    size: Size.create(width, height),
    content: 'hello',
  });
}

function renderCanvas(elements: readonly Element[] = []) {
  const store = createCanvasViewportStore(Size.create(800, 600));
  const selectionStore = createSelectionStore();

  render(<Canvas store={store} selectionStore={selectionStore} elements={elements} />);

  return { store, selectionStore };
}

const FIRST_ITEM = createElement('first', 100, 100, 120, 80);

const SECOND_ITEM = createElement('second', 300, 200, 100, 100);

describe('Canvas', () => {
  beforeAll(() => {
    if (!('setPointerCapture' in Element.prototype)) {
      Object.defineProperty(Element.prototype, 'setPointerCapture', {
        value: jest.fn(),
        configurable: true,
      });
      Object.defineProperty(Element.prototype, 'hasPointerCapture', {
        value: jest.fn().mockReturnValue(true),
        configurable: true,
      });
      Object.defineProperty(Element.prototype, 'releasePointerCapture', {
        value: jest.fn(),
        configurable: true,
      });
    }
  });

  it('renders the canvas with a grid and a hint', () => {
    renderCanvas();

    expect(screen.getByRole('application', { name: 'Canvas' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Drag to select · Space + drag to pan · Ctrl/Cmd + scroll to zoom · Esc to clear · Ctrl/Cmd + A to select all',
      ),
    ).toBeInTheDocument();
  });

  it('exposes the canvas as a focusable region with keyboard shortcuts', () => {
    renderCanvas();

    const canvas = screen.getByRole('application', { name: 'Canvas' });
    expect(canvas).toHaveAttribute('tabindex', '0');
    expect(canvas).toHaveAttribute('aria-keyshortcuts', 'Escape Control+A Meta+A');
  });

  it('renders an infinite grid aligned to the world origin', () => {
    renderCanvas();

    const grid = screen.getByTestId('canvas-grid');
    expect(grid.style.backgroundSize).toBe('40px 40px');
    expect(grid.style.backgroundPosition).toBe('0px 0px');
  });

  it('moves the grid with the viewport when panning', async () => {
    renderCanvas();
    const canvas = screen.getByRole('application', { name: 'Canvas' });
    const user = userEvent.setup();

    fireEvent.keyDown(window, { code: 'Space' });
    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { x: 0, y: 0 } },
      { coords: { x: 50, y: 25 } },
    ]);
    fireEvent.keyUp(window, { code: 'Space' });

    const grid = screen.getByTestId('canvas-grid');
    expect(grid.style.backgroundPosition).toBe('10px 25px');
    expect(grid.style.backgroundSize).toBe('40px 40px');
  });

  it('scales the grid step with the zoom level', () => {
    renderCanvas();
    const canvas = screen.getByRole('application', { name: 'Canvas' });

    fireEvent.wheel(canvas, { ctrlKey: true, deltaY: -100, clientX: 200, clientY: 150 });

    const grid = screen.getByTestId('canvas-grid');
    const scale = Number(canvas.getAttribute('data-scale'));
    expect(grid.style.backgroundSize).toBe(`${40 * scale}px ${40 * scale}px`);
  });

  it('pans the viewport when dragging with space held', async () => {
    renderCanvas();
    const canvas = screen.getByRole('application', { name: 'Canvas' });
    const user = userEvent.setup();

    fireEvent.keyDown(window, { code: 'Space' });
    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { x: 0, y: 0 } },
      { coords: { x: 50, y: 25 } },
    ]);
    fireEvent.keyUp(window, { code: 'Space' });

    const world = screen.getByTestId('canvas-world');
    expect(world.style.transform).toContain('translate(50px, 25px)');
    expect(world.style.transform).toContain('scale(1)');
  });

  it('pans the viewport with a plain wheel scroll', () => {
    renderCanvas();
    const canvas = screen.getByRole('application', { name: 'Canvas' });

    fireEvent.wheel(canvas, { deltaX: 10, deltaY: 40 });

    const world = screen.getByTestId('canvas-world');
    expect(world.style.transform).toContain('translate(-10px, -40px)');
    expect(Number(canvas.getAttribute('data-scale'))).toBe(1);
  });

  it('releases the panning state after dragging', async () => {
    renderCanvas();
    const canvas = screen.getByRole('application', { name: 'Canvas' });
    const user = userEvent.setup();

    fireEvent.keyDown(window, { code: 'Space' });
    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { x: 0, y: 0 } },
      { coords: { x: 10, y: 10 } },
      { keys: '[/MouseLeft]' },
    ]);
    fireEvent.keyUp(window, { code: 'Space' });

    expect(canvas).toHaveAttribute('data-panning', 'false');
  });

  it('zooms the viewport on ctrl + wheel', () => {
    renderCanvas();
    const canvas = screen.getByRole('application', { name: 'Canvas' });

    fireEvent.wheel(canvas, { ctrlKey: true, deltaY: -100, clientX: 200, clientY: 150 });

    const world = canvas.firstChild as HTMLElement;
    expect(world.style.transform).not.toContain('scale(1)');
    expect(Number(canvas.getAttribute('data-scale'))).toBeGreaterThan(1);
  });

  it('does not zoom on a plain wheel', () => {
    renderCanvas();
    const canvas = screen.getByRole('application', { name: 'Canvas' });

    fireEvent.wheel(canvas, { deltaY: -100 });

    expect(Number(canvas.getAttribute('data-scale'))).toBe(1);
  });

  it('shows the current zoom percentage', () => {
    renderCanvas();
    const canvas = screen.getByRole('application', { name: 'Canvas' });

    expect(screen.getByLabelText('Zoom level')).toHaveTextContent('100%');

    fireEvent.wheel(canvas, { ctrlKey: true, deltaY: -100, clientX: 200, clientY: 150 });

    expect(screen.getByLabelText('Zoom level')).not.toHaveTextContent('100%');
  });

  it('resets the viewport when clicking reset view', async () => {
    renderCanvas();
    const canvas = screen.getByRole('application', { name: 'Canvas' });
    const user = userEvent.setup();

    fireEvent.wheel(canvas, { ctrlKey: true, deltaY: -100, clientX: 200, clientY: 150 });
    expect(Number(canvas.getAttribute('data-scale'))).toBeGreaterThan(1);

    await user.click(screen.getByRole('button', { name: 'Reset view' }));

    const world = screen.getByTestId('canvas-world');
    expect(Number(canvas.getAttribute('data-scale'))).toBe(1);
    expect(world.style.transform).toContain('translate(0px, 0px)');
    expect(screen.getByLabelText('Zoom level')).toHaveTextContent('100%');
  });

  describe('selection', () => {
    it('does not render a selection overlay by default', () => {
      renderCanvas([FIRST_ITEM]);

      expect(screen.queryByTestId('selection-overlay')).not.toBeInTheDocument();
    });

    it('selects an item when clicking it', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 150, y: 130 } });

      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first']);
      expect(screen.getByTestId('selection-overlay')).toHaveAttribute('data-selected-id', 'first');
    });

    it('replaces the selection when clicking another item', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 150, y: 130 } });
      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 350, y: 250 } });

      expect(selectionStore.getSnapshot().selectedIds).toEqual(['second']);
      expect(screen.getByTestId('selection-overlay')).toHaveAttribute('data-selected-id', 'second');
    });

    it('clears the selection when clicking empty space', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 150, y: 130 } });
      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first']);

      await user.pointer([
        { keys: '[MouseLeft>]', target: canvas, coords: { x: 700, y: 500 } },
        { keys: '[/MouseLeft]' },
      ]);
      expect(selectionStore.getSnapshot().selectedIds).toEqual([]);
      expect(screen.queryByTestId('selection-overlay')).not.toBeInTheDocument();
    });

    it('renders the selection overlay at the item world bounds', async () => {
      renderCanvas([FIRST_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 150, y: 130 } });

      const overlay = screen.getByTestId('selection-overlay');
      expect(overlay.style.left).toBe('100px');
      expect(overlay.style.top).toBe('100px');
      expect(overlay.style.width).toBe('120px');
      expect(overlay.style.height).toBe('80px');
    });

    it('adds an item to the selection with a modifier key', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 150, y: 130 } });
      await user.keyboard('{Shift>}');
      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 350, y: 250 } });
      await user.keyboard('{/Shift}');

      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first', 'second']);
      expect(screen.getByTestId('canvas-item-first')).toHaveAttribute('data-selected', 'true');
      expect(screen.getByTestId('canvas-item-second')).toHaveAttribute('data-selected', 'true');
      expect(screen.getByTestId('selection-overlay')).toHaveAttribute('data-selection-count', '2');
    });

    it('removes an already selected item with a modifier key', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 150, y: 130 } });
      await user.keyboard('{Meta>}');
      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 350, y: 250 } });
      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 150, y: 130 } });
      await user.keyboard('{/Meta}');

      expect(selectionStore.getSnapshot().selectedIds).toEqual(['second']);
      expect(screen.getByTestId('canvas-item-first')).toHaveAttribute('data-selected', 'false');
    });

    it('clears the selection when modifier-clicking empty space', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 150, y: 130 } });
      await user.keyboard('{Shift>}');
      await user.pointer([
        { keys: '[MouseLeft>]', target: canvas, coords: { x: 700, y: 500 } },
        { keys: '[/MouseLeft]' },
      ]);
      await user.keyboard('{/Shift}');

      expect(selectionStore.getSnapshot().selectedIds).toEqual([]);
      expect(screen.queryByTestId('selection-overlay')).not.toBeInTheDocument();
    });

    it('renders a group bounding box without resize handles for multiple items', async () => {
      renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 150, y: 130 } });
      await user.keyboard('{Shift>}');
      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 350, y: 250 } });
      await user.keyboard('{/Shift}');

      const overlay = screen.getByTestId('selection-overlay');
      expect(overlay).toHaveAttribute('data-selection-count', '2');
      expect(overlay).toHaveAttribute('data-selected-ids', 'first,second');
      expect(overlay.style.left).toBe('100px');
      expect(overlay.style.top).toBe('100px');
      expect(overlay.style.width).toBe('300px');
      expect(overlay.style.height).toBe('200px');
      expect(overlay.querySelectorAll('span')).toHaveLength(0);
    });

    it('does not pan or start a marquee when dragging from a selectable item', async () => {
      const { store } = renderCanvas([FIRST_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const item = screen.getByTestId('canvas-item-first');
      const user = userEvent.setup();

      await user.pointer([
        { keys: '[MouseLeft>]', target: item, coords: { x: 150, y: 130 } },
        { coords: { x: 250, y: 230 } },
      ]);

      expect(store.getSnapshot().transform.translation).toEqual(Position.create(0, 0));
      expect(screen.queryByTestId('drag-selection-rect')).not.toBeInTheDocument();
      expect(canvas).toHaveAttribute('data-selecting', 'false');
    });

    it('selects every item intersecting the dragged rectangle', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      await user.pointer([
        { keys: '[MouseLeft>]', target: canvas, coords: { x: 0, y: 0 } },
        { coords: { x: 450, y: 350 } },
        { keys: '[/MouseLeft]' },
      ]);

      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first', 'second']);
      expect(screen.getByTestId('canvas-item-first')).toHaveAttribute('data-selected', 'true');
      expect(screen.getByTestId('canvas-item-second')).toHaveAttribute('data-selected', 'true');
      expect(screen.getByTestId('selection-overlay')).toHaveAttribute('data-selection-count', '2');
    });

    it('renders the marquee rectangle while dragging and removes it after', async () => {
      renderCanvas([FIRST_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      await user.pointer([
        { keys: '[MouseLeft>]', target: canvas, coords: { x: 10, y: 20 } },
        { coords: { x: 210, y: 170 } },
      ]);

      expect(canvas).toHaveAttribute('data-selecting', 'true');
      const marquee = screen.getByTestId('drag-selection-rect');
      expect(marquee.style.left).toBe('10px');
      expect(marquee.style.top).toBe('20px');
      expect(marquee.style.width).toBe('200px');
      expect(marquee.style.height).toBe('150px');

      await user.pointer({ keys: '[/MouseLeft]' });

      expect(canvas).toHaveAttribute('data-selecting', 'false');
      expect(screen.queryByTestId('drag-selection-rect')).not.toBeInTheDocument();
    });

    it('adds the items in the rectangle to the selection with a modifier', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      await user.pointer([
        { keys: '[MouseLeft>]', target: canvas, coords: { x: 150, y: 130 } },
        { keys: '[/MouseLeft]' },
      ]);
      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first']);

      await user.keyboard('{Shift>}');
      await user.pointer([
        { keys: '[MouseLeft>]', target: canvas, coords: { x: 350, y: 150 } },
        { coords: { x: 450, y: 350 } },
        { keys: '[/MouseLeft]' },
      ]);
      await user.keyboard('{/Shift}');

      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first', 'second']);
    });

    it('clears the selection with Escape when the canvas is focused', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 150, y: 130 } });
      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first']);

      canvas.focus();
      await user.keyboard('{Escape}');

      expect(selectionStore.getSnapshot().selectedIds).toEqual([]);
      expect(screen.queryByTestId('selection-overlay')).not.toBeInTheDocument();
      expect(canvas).toHaveFocus();
    });

    it('selects all items with Ctrl+A when focused', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      canvas.focus();
      await user.keyboard('{Control>}a{/Control}');

      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first', 'second']);
      expect(screen.getByTestId('selection-overlay')).toHaveAttribute('data-selection-count', '2');
      expect(canvas).toHaveFocus();
    });

    it('selects all items with Cmd+A when focused', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      canvas.focus();
      await user.keyboard('{Meta>}a{/Meta}');

      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first', 'second']);
    });

    it('does not handle selection keyboard commands when not focused', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const user = userEvent.setup();

      act(() => {
        selectionStore.select('first');
      });
      await user.keyboard('{Escape}');

      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first']);
    });
  });
});
