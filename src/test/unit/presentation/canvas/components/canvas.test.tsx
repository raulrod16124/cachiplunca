import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Bounds, Position, Size } from '../../../../../domain/shared';
import type { SelectableItem } from '../../../../../application/services';
import {
  createCanvasViewportStore,
  createSelectionStore,
} from '../../../../../application/services';
import { Canvas } from '../../../../../presentation/canvas/components/canvas';

function renderCanvas(items: readonly SelectableItem[] = []) {
  const store = createCanvasViewportStore(Size.create(800, 600));
  const selectionStore = createSelectionStore();

  render(<Canvas store={store} selectionStore={selectionStore} items={items} />);

  return { store, selectionStore };
}

const FIRST_ITEM: SelectableItem = {
  id: 'first',
  bounds: Bounds.fromXYWH(100, 100, 120, 80),
};

const SECOND_ITEM: SelectableItem = {
  id: 'second',
  bounds: Bounds.fromXYWH(300, 200, 100, 100),
};

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
    expect(screen.getByText('Drag to pan · Ctrl/Cmd + scroll to zoom')).toBeInTheDocument();
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

    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { x: 0, y: 0 } },
      { coords: { x: 50, y: 25 } },
    ]);

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

  it('pans the viewport when dragging', async () => {
    renderCanvas();
    const canvas = screen.getByRole('application', { name: 'Canvas' });
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { x: 0, y: 0 } },
      { coords: { x: 50, y: 25 } },
    ]);

    const world = screen.getByTestId('canvas-world');
    expect(world.style.transform).toContain('translate(50px, 25px)');
    expect(world.style.transform).toContain('scale(1)');
  });

  it('releases the panning state after dragging', async () => {
    renderCanvas();
    const canvas = screen.getByRole('application', { name: 'Canvas' });
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { x: 0, y: 0 } },
      { coords: { x: 10, y: 10 } },
      { keys: '[/MouseLeft]' },
    ]);

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

      expect(selectionStore.getSnapshot().selectedId).toBe('first');
      expect(screen.getByTestId('selection-overlay')).toHaveAttribute('data-selected-id', 'first');
    });

    it('replaces the selection when clicking another item', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 150, y: 130 } });
      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 350, y: 250 } });

      expect(selectionStore.getSnapshot().selectedId).toBe('second');
      expect(screen.getByTestId('selection-overlay')).toHaveAttribute('data-selected-id', 'second');
    });

    it('clears the selection when clicking empty space', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 150, y: 130 } });
      expect(selectionStore.getSnapshot().selectedId).toBe('first');

      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 700, y: 500 } });
      expect(selectionStore.getSnapshot().selectedId).toBeNull();
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

    it('does not start panning when the press starts on a selectable item', () => {
      const { store } = renderCanvas([FIRST_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const item = screen.getByTestId('canvas-item-first');

      fireEvent.pointerDown(item, { button: 0, pointerId: 1, clientX: 150, clientY: 130 });
      fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 200, clientY: 180 });

      expect(store.getSnapshot().transform.translation).toEqual(Position.create(0, 0));
    });
  });
});
