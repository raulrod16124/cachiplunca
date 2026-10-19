import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Position, ElementId, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import { createTextElement, richTextFromPlain } from '../../../../../domain/element';
import type { Element, ElementType } from '../../../../../domain/element';
import {
  createCanvasViewportStore,
  createCommandHistory,
  createSelectionStore,
} from '../../../../../application/services';
import type { CommandHistory } from '../../../../../application/services';
import { createFunctionCommand } from '../../../../../application/commands';
import type { UpdateElementInput } from '../../../../../application/commands';
import { Canvas } from '../../../../../presentation/canvas/components/canvas';

jest.mock('../../../../../presentation/canvas/components/rich-text-editor', () =>
  require('../../../../fixtures/rich-text-editor-stub'),
);

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

function renderCanvas(
  elements: readonly Element[] = [],
  onMoveElements?: (next: readonly Element[]) => void,
  onResizeElements?: (next: readonly Element[]) => void,
  onDeleteElements?: (next: readonly Element[]) => void,
  onDuplicateElements?: (next: readonly Element[], duplicatedIds: readonly string[]) => void,
  generateId?: () => ElementId,
  onPasteElements?: (next: readonly Element[], pastedIds: readonly string[]) => void,
  history?: CommandHistory<readonly Element[]>,
  onUndoElements?: (next: readonly Element[]) => void,
  onRedoElements?: (next: readonly Element[]) => void,
  onTransformEnd?: () => void,
  onReorderElements?: (next: readonly Element[]) => void,
  onUpdateElement?: (input: UpdateElementInput) => void,
) {
  const store = createCanvasViewportStore(Size.create(800, 600));
  const selectionStore = createSelectionStore();

  render(
    <Canvas
      store={store}
      selectionStore={selectionStore}
      elements={elements}
      onMoveElements={onMoveElements}
      onResizeElements={onResizeElements}
      onDeleteElements={onDeleteElements}
      onDuplicateElements={onDuplicateElements}
      generateId={generateId}
      onPasteElements={onPasteElements}
      history={history}
      onUndoElements={onUndoElements}
      onRedoElements={onRedoElements}
      onTransformEnd={onTransformEnd}
      onReorderElements={onReorderElements}
      onUpdateElement={onUpdateElement}
    />,
  );

  return { store, selectionStore };
}

function historyWithRecordedCommand(
  initial: readonly Element[],
  forward: readonly Element[],
): CommandHistory<readonly Element[]> {
  const history = createCommandHistory<readonly Element[]>({ initial });

  history.execute(
    createFunctionCommand<readonly Element[]>({
      metadata: { label: 'Change elements' },
      apply: () => ({ status: 'ok', state: forward }),
      revert: () => ({ status: 'ok', state: initial }),
    }),
  );

  return history;
}

function historyWithUndoneCommand(
  initial: readonly Element[],
  forward: readonly Element[],
): CommandHistory<readonly Element[]> {
  const history = historyWithRecordedCommand(initial, forward);
  history.undo();

  return history;
}

function sequentialIds(): () => ElementId {
  let counter = 0;
  return () => {
    counter += 1;
    return ElementId.create(`copy-${counter}`);
  };
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
        'Arrow keys to move selection · Shift + Arrow to extend selection · Drag to select · Space + drag to pan · Ctrl/Cmd + scroll to zoom · Esc to clear · Ctrl/Cmd + A to select all · Delete to remove · Ctrl/Cmd + D to duplicate · Ctrl/Cmd + C to copy · Ctrl/Cmd + V to paste · Ctrl/Cmd + Z to undo · Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y to redo · Ctrl/Cmd + ] to bring to front · Ctrl/Cmd + [ to send to back · Right-click an object for more options',
      ),
    ).toBeInTheDocument();
  });

  it('shows an empty board state when there are no elements', () => {
    renderCanvas([]);

    expect(screen.getByRole('heading', { name: 'This board is empty' })).toBeInTheDocument();
  });

  it('hides the empty board state once the board has elements', () => {
    renderCanvas([FIRST_ITEM]);

    expect(screen.queryByRole('heading', { name: 'This board is empty' })).not.toBeInTheDocument();
  });

  it('exposes the canvas as a focusable region with keyboard shortcuts', () => {
    renderCanvas();

    const canvas = screen.getByRole('application', { name: 'Canvas' });
    expect(canvas).toHaveAttribute('tabindex', '0');
    expect(canvas).toHaveAttribute(
      'aria-keyshortcuts',
      'ArrowUp ArrowDown ArrowLeft ArrowRight Escape Control+A Meta+A Delete Control+D Meta+D Control+C Meta+C Control+V Meta+V Control+Z Meta+Z Control+Shift+Z Meta+Shift+Z Control+Y Meta+Y Control+] Meta+] Control+[ Meta+[',
    );
  });

  it('describes the board to assistive technology', () => {
    renderCanvas([FIRST_ITEM]);

    const canvas = screen.getByRole('application', { name: 'Canvas' });
    expect(canvas).toHaveAttribute('aria-describedby', 'canvas-board-summary');
    expect(screen.getByTestId('canvas-board-summary')).toHaveTextContent(
      'Board with 1 element: 1 text.',
    );
  });

  it('summarizes an empty board', () => {
    renderCanvas([]);

    expect(screen.getByTestId('canvas-board-summary')).toHaveTextContent('This board is empty.');
  });

  it('exposes each element with an accessible name', () => {
    renderCanvas([FIRST_ITEM]);

    expect(screen.getByRole('group', { name: 'Text: hello' })).toBeInTheDocument();
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

    expect(screen.getByTestId('zoom-level')).toHaveTextContent('100%');

    fireEvent.wheel(canvas, { ctrlKey: true, deltaY: -100, clientX: 200, clientY: 150 });

    expect(screen.getByTestId('zoom-level')).not.toHaveTextContent('100%');
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
    expect(screen.getByTestId('zoom-level')).toHaveTextContent('100%');
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

  describe('keyboard navigation', () => {
    it('selects the first item on the first arrow when focused', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      canvas.focus();
      await user.keyboard('{ArrowRight}');

      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first']);
      expect(canvas).toHaveAttribute('data-active-id', 'first');
      expect(canvas).toHaveAttribute('aria-activedescendant', 'element-first');
    });

    it('moves the selection to the neighbour in the direction', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      canvas.focus();
      await user.keyboard('{ArrowRight}{ArrowRight}');

      expect(selectionStore.getSnapshot().selectedIds).toEqual(['second']);
      expect(canvas).toHaveAttribute('aria-activedescendant', 'element-second');
      expect(screen.getByTestId('canvas-item-second')).toHaveAttribute('data-selected', 'true');
    });

    it('extends the selection with shift', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      canvas.focus();
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{Shift>}{ArrowRight}{/Shift}');

      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first', 'second']);
      expect(canvas).toHaveAttribute('aria-activedescendant', 'element-second');
    });

    it('ignores navigation when not focused', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const user = userEvent.setup();

      act(() => {
        selectionStore.select('first');
      });
      await user.keyboard('{ArrowRight}');

      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first']);
    });
  });

  describe('movement', () => {
    it('reports the moved position when dragging an item', async () => {
      const calls: (readonly Element[])[] = [];
      const onMoveElements = jest.fn((next: readonly Element[]) => {
        calls.push(next);
      });
      renderCanvas([FIRST_ITEM], onMoveElements);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const item = screen.getByTestId('canvas-item-first');
      const user = userEvent.setup();

      await user.pointer([
        { keys: '[MouseLeft>]', target: item, coords: { x: 150, y: 130 } },
        { coords: { x: 200, y: 160 } },
      ]);

      expect(canvas).toHaveAttribute('data-moving', 'true');
      expect(onMoveElements).toHaveBeenCalled();
      expect(calls.at(-1)?.[0]?.position.equals(Position.create(150, 130))).toBe(true);

      await user.pointer({ keys: '[/MouseLeft]' });
      expect(canvas).toHaveAttribute('data-moving', 'false');
    });

    it('signals the end of a move gesture through onTransformEnd', async () => {
      const onMoveElements = jest.fn();
      const onTransformEnd = jest.fn();
      renderCanvas(
        [FIRST_ITEM],
        onMoveElements,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        onTransformEnd,
      );
      const item = screen.getByTestId('canvas-item-first');
      const user = userEvent.setup();

      await user.pointer([
        { keys: '[MouseLeft>]', target: item, coords: { x: 150, y: 130 } },
        { coords: { x: 200, y: 160 } },
        { keys: '[/MouseLeft]' },
      ]);

      expect(onTransformEnd).toHaveBeenCalledTimes(1);
    });

    it('collapses a multi selection to the clicked item on a plain click', async () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const item = screen.getByTestId('canvas-item-first');
      const user = userEvent.setup();

      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 150, y: 130 } });
      await user.keyboard('{Shift>}');
      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 350, y: 250 } });
      await user.keyboard('{/Shift}');
      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first', 'second']);

      await user.pointer([
        { keys: '[MouseLeft>]', target: item, coords: { x: 150, y: 130 } },
        { keys: '[/MouseLeft]' },
      ]);

      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first']);
    });

    it('moves the whole selection and keeps it when dragging a selected item', async () => {
      const calls: (readonly Element[])[] = [];
      const onMoveElements = jest.fn((next: readonly Element[]) => {
        calls.push(next);
      });
      const { selectionStore } = renderCanvas([FIRST_ITEM, SECOND_ITEM], onMoveElements);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const item = screen.getByTestId('canvas-item-first');
      const user = userEvent.setup();

      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 150, y: 130 } });
      await user.keyboard('{Shift>}');
      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 350, y: 250 } });
      await user.keyboard('{/Shift}');

      await user.pointer([
        { keys: '[MouseLeft>]', target: item, coords: { x: 150, y: 130 } },
        { coords: { x: 180, y: 160 } },
        { keys: '[/MouseLeft]' },
      ]);

      expect(calls.at(-1)?.[0]?.position.equals(Position.create(130, 130))).toBe(true);
      expect(calls.at(-1)?.[1]?.position.equals(Position.create(330, 230))).toBe(true);
      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first', 'second']);
    });
  });

  describe('resizing', () => {
    it('resizes the single selected item when dragging a resize handle', async () => {
      const calls: (readonly Element[])[] = [];
      const onResizeElements = jest.fn((next: readonly Element[]) => {
        calls.push(next);
      });
      const { selectionStore } = renderCanvas([FIRST_ITEM], undefined, onResizeElements);
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      act(() => {
        selectionStore.select('first');
      });

      const overlay = screen.getByTestId('selection-overlay');
      const handle = overlay.querySelector('[data-resize-anchor="bottom-right"]');
      if (!(handle instanceof HTMLElement)) {
        throw new Error('Expected a bottom-right resize handle');
      }

      const user = userEvent.setup();

      await user.pointer([
        { keys: '[MouseLeft>]', target: handle, coords: { x: 220, y: 180 } },
        { coords: { x: 250, y: 210 } },
      ]);

      expect(canvas).toHaveAttribute('data-resizing', 'true');
      expect(onResizeElements).toHaveBeenCalled();
      expect(calls.at(-1)?.[0]?.size.equals(Size.create(150, 110))).toBe(true);

      await user.pointer({ keys: '[/MouseLeft]' });
      expect(canvas).toHaveAttribute('data-resizing', 'false');
    });

    it('resizes from the top-left handle moving the origin', async () => {
      const calls: (readonly Element[])[] = [];
      const onResizeElements = jest.fn((next: readonly Element[]) => {
        calls.push(next);
      });
      const { selectionStore } = renderCanvas([FIRST_ITEM], undefined, onResizeElements);

      act(() => {
        selectionStore.select('first');
      });

      const overlay = screen.getByTestId('selection-overlay');
      const handle = overlay.querySelector('[data-resize-anchor="top-left"]');
      if (!(handle instanceof HTMLElement)) {
        throw new Error('Expected a top-left resize handle');
      }

      const user = userEvent.setup();

      await user.pointer([
        { keys: '[MouseLeft>]', target: handle, coords: { x: 100, y: 100 } },
        { coords: { x: 120, y: 120 } },
      ]);

      expect(calls.at(-1)?.[0]?.position.equals(Position.create(120, 120))).toBe(true);
      expect(calls.at(-1)?.[0]?.size.equals(Size.create(100, 60))).toBe(true);
    });

    it('does not offer resize handles for a multi selection', () => {
      const { selectionStore } = renderCanvas([FIRST_ITEM, SECOND_ITEM]);

      act(() => {
        selectionStore.selectMany(['first', 'second']);
      });

      const overlay = screen.getByTestId('selection-overlay');

      expect(overlay.querySelectorAll('[data-resize-handle]')).toHaveLength(0);
    });
  });

  describe('deletion', () => {
    it('deletes the selected item on Delete and clears the selection', async () => {
      const calls: (readonly Element[])[] = [];
      const onDeleteElements = jest.fn((next: readonly Element[]) => {
        calls.push(next);
      });
      const { selectionStore } = renderCanvas(
        [FIRST_ITEM, SECOND_ITEM],
        undefined,
        undefined,
        onDeleteElements,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      act(() => {
        selectionStore.select('first');
      });

      canvas.focus();
      await userEvent.setup().keyboard('{Delete}');

      expect(onDeleteElements).toHaveBeenCalledTimes(1);
      expect(calls.at(-1)?.map((element) => element.id.value)).toEqual(['second']);
      expect(selectionStore.getSnapshot().selectedIds).toEqual([]);
    });

    it('deletes the whole selection on Delete', async () => {
      const onDeleteElements = jest.fn();
      const { selectionStore } = renderCanvas(
        [FIRST_ITEM, SECOND_ITEM],
        undefined,
        undefined,
        onDeleteElements,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      act(() => {
        selectionStore.selectMany(['first', 'second']);
      });

      canvas.focus();
      await userEvent.setup().keyboard('{Delete}');

      expect(onDeleteElements).toHaveBeenCalledWith([]);
    });

    it('does nothing when there is no selection', async () => {
      const onDeleteElements = jest.fn();
      renderCanvas([FIRST_ITEM], undefined, undefined, onDeleteElements);
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      canvas.focus();
      await userEvent.setup().keyboard('{Delete}');

      expect(onDeleteElements).not.toHaveBeenCalled();
    });
  });

  describe('duplication', () => {
    it('duplicates the selected item on Ctrl+D and selects the copy', async () => {
      const calls: (readonly Element[])[] = [];
      const onDuplicateElements = jest.fn(
        (next: readonly Element[], duplicatedIds: readonly string[]) => {
          calls.push(next);
          expect(duplicatedIds).toEqual(['copy-1']);
        },
      );
      const { selectionStore } = renderCanvas(
        [FIRST_ITEM, SECOND_ITEM],
        undefined,
        undefined,
        undefined,
        onDuplicateElements,
        sequentialIds(),
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      act(() => {
        selectionStore.select('first');
      });

      canvas.focus();
      await userEvent.setup().keyboard('{Control>}d{/Control}');

      expect(onDuplicateElements).toHaveBeenCalledTimes(1);
      expect(calls.at(-1)?.map((element) => element.id.value)).toEqual([
        'first',
        'second',
        'copy-1',
      ]);
      expect(selectionStore.getSnapshot().selectedIds).toEqual(['copy-1']);
    });

    it('duplicates the whole selection on Ctrl+D', async () => {
      const onDuplicateElements = jest.fn();
      const { selectionStore } = renderCanvas(
        [FIRST_ITEM, SECOND_ITEM],
        undefined,
        undefined,
        undefined,
        onDuplicateElements,
        sequentialIds(),
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      act(() => {
        selectionStore.selectMany(['first', 'second']);
      });

      canvas.focus();
      await userEvent.setup().keyboard('{Control>}d{/Control}');

      expect(onDuplicateElements).toHaveBeenCalledTimes(1);
      expect(selectionStore.getSnapshot().selectedIds).toEqual(['copy-1', 'copy-2']);
    });

    it('does nothing when there is no selection', async () => {
      const onDuplicateElements = jest.fn();
      renderCanvas(
        [FIRST_ITEM],
        undefined,
        undefined,
        undefined,
        onDuplicateElements,
        sequentialIds(),
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      canvas.focus();
      await userEvent.setup().keyboard('{Control>}d{/Control}');

      expect(onDuplicateElements).not.toHaveBeenCalled();
    });
  });

  describe('copy/paste', () => {
    it('copies the selection on Ctrl+C and pastes a new element on Ctrl+V', async () => {
      const calls: (readonly Element[])[] = [];
      const onPasteElements = jest.fn((next: readonly Element[], pastedIds: readonly string[]) => {
        calls.push(next);
        expect(pastedIds).toEqual(['copy-1']);
      });
      const { selectionStore } = renderCanvas(
        [FIRST_ITEM, SECOND_ITEM],
        undefined,
        undefined,
        undefined,
        undefined,
        sequentialIds(),
        onPasteElements,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      act(() => {
        selectionStore.select('first');
      });

      canvas.focus();
      await user.keyboard('{Control>}c{/Control}');
      await user.keyboard('{Control>}v{/Control}');

      expect(onPasteElements).toHaveBeenCalledTimes(1);
      expect(calls.at(-1)?.map((element) => element.id.value)).toEqual([
        'first',
        'second',
        'copy-1',
      ]);
      expect(selectionStore.getSnapshot().selectedIds).toEqual(['copy-1']);
    });

    it('pastes every copied element after a multi selection', async () => {
      const onPasteElements = jest.fn();
      const { selectionStore } = renderCanvas(
        [FIRST_ITEM, SECOND_ITEM],
        undefined,
        undefined,
        undefined,
        undefined,
        sequentialIds(),
        onPasteElements,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      act(() => {
        selectionStore.selectMany(['first', 'second']);
      });

      canvas.focus();
      await user.keyboard('{Control>}c{/Control}');
      await user.keyboard('{Control>}v{/Control}');

      expect(onPasteElements).toHaveBeenCalledTimes(1);
      expect(selectionStore.getSnapshot().selectedIds).toEqual(['copy-1', 'copy-2']);
    });

    it('does nothing on paste when nothing was copied', async () => {
      const onPasteElements = jest.fn();
      renderCanvas(
        [FIRST_ITEM],
        undefined,
        undefined,
        undefined,
        undefined,
        sequentialIds(),
        onPasteElements,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      canvas.focus();
      await userEvent.setup().keyboard('{Control>}v{/Control}');

      expect(onPasteElements).not.toHaveBeenCalled();
    });

    it('does nothing on copy when there is no selection', async () => {
      const onPasteElements = jest.fn();
      const { selectionStore } = renderCanvas(
        [FIRST_ITEM],
        undefined,
        undefined,
        undefined,
        undefined,
        sequentialIds(),
        onPasteElements,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      canvas.focus();
      await user.keyboard('{Control>}c{/Control}');
      await user.keyboard('{Control>}v{/Control}');

      expect(onPasteElements).not.toHaveBeenCalled();
      expect(selectionStore.getSnapshot().selectedIds).toEqual([]);
    });
  });

  describe('z-order', () => {
    it('brings the selected item to the front on Ctrl+]', async () => {
      const onReorderElements = jest.fn();
      const { selectionStore } = renderCanvas(
        [FIRST_ITEM, SECOND_ITEM],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        onReorderElements,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      act(() => {
        selectionStore.select('first');
      });

      canvas.focus();
      await userEvent.setup().keyboard('{Control>}]{/Control}');

      expect(onReorderElements).toHaveBeenCalledTimes(1);
      const reordered: readonly Element[] = onReorderElements.mock.calls[0][0];
      expect(reordered.map((element) => element.id.value)).toEqual(['second', 'first']);
    });

    it('sends the selected item to the back on Ctrl+[', async () => {
      const onReorderElements = jest.fn();
      const { selectionStore } = renderCanvas(
        [FIRST_ITEM, SECOND_ITEM],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        onReorderElements,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      act(() => {
        selectionStore.select('second');
      });

      canvas.focus();
      await userEvent.setup().keyboard('{Control>}[[{/Control}');

      expect(onReorderElements).toHaveBeenCalledTimes(1);
      const reordered: readonly Element[] = onReorderElements.mock.calls[0][0];
      expect(reordered.map((element) => element.id.value)).toEqual(['second', 'first']);
    });

    it('does nothing on the z-order shortcuts when there is no selection', async () => {
      const onReorderElements = jest.fn();
      renderCanvas(
        [FIRST_ITEM],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        onReorderElements,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      canvas.focus();
      await userEvent.setup().keyboard('{Control>}]{/Control}');

      expect(onReorderElements).not.toHaveBeenCalled();
    });

    it('opens a context menu on right-click and brings the hit item to the front', async () => {
      const onReorderElements = jest.fn();
      const { selectionStore } = renderCanvas(
        [FIRST_ITEM, SECOND_ITEM],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        onReorderElements,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      fireEvent.contextMenu(canvas, { clientX: 150, clientY: 130 });

      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first']);

      await user.click(screen.getByRole('menuitem', { name: 'Bring to front' }));

      expect(onReorderElements).toHaveBeenCalledTimes(1);
      const reordered: readonly Element[] = onReorderElements.mock.calls[0][0];
      expect(reordered.map((element) => element.id.value)).toEqual(['second', 'first']);
    });

    it('sends the hit item to the back from the context menu', async () => {
      const onReorderElements = jest.fn();
      const { selectionStore } = renderCanvas(
        [FIRST_ITEM, SECOND_ITEM],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        onReorderElements,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      fireEvent.contextMenu(canvas, { clientX: 350, clientY: 250 });

      expect(selectionStore.getSnapshot().selectedIds).toEqual(['second']);

      await user.click(screen.getByRole('menuitem', { name: 'Send to back' }));

      expect(onReorderElements).toHaveBeenCalledTimes(1);
      const reordered: readonly Element[] = onReorderElements.mock.calls[0][0];
      expect(reordered.map((element) => element.id.value)).toEqual(['second', 'first']);
    });

    it('does not open a context menu when right-clicking empty space', () => {
      renderCanvas([FIRST_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      fireEvent.contextMenu(canvas, { clientX: 700, clientY: 550 });

      expect(screen.queryByRole('menuitem', { name: 'Bring to front' })).not.toBeInTheDocument();
    });

    it('shows text formatting options when right-clicking a text element', async () => {
      const { selectionStore } = renderCanvas(
        [FIRST_ITEM],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        jest.fn(),
      );
      act(() => {
        selectionStore.select('first');
      });

      const text = screen.getByText('hello');
      const range = document.createRange();
      range.selectNodeContents(text);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      const canvas = screen.getByRole('application', { name: 'Canvas' });
      fireEvent.contextMenu(canvas, { clientX: 150, clientY: 130 });

      expect(await screen.findByRole('toolbar', { name: 'Text formatting' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Font' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();

      window.getSelection()?.removeAllRanges();
    });
  });

  describe('undo', () => {
    it('undoes the last command on Ctrl+Z and emits the previous state', async () => {
      const onUndoElements = jest.fn();
      const history = historyWithRecordedCommand([FIRST_ITEM], [FIRST_ITEM, SECOND_ITEM]);
      renderCanvas(
        [FIRST_ITEM, SECOND_ITEM],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        history,
        onUndoElements,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      canvas.focus();
      await userEvent.setup().keyboard('{Control>}z{/Control}');

      expect(onUndoElements).toHaveBeenCalledTimes(1);
      expect(onUndoElements).toHaveBeenCalledWith([FIRST_ITEM]);
      expect(history.canUndo()).toBe(false);
    });

    it('undoes on Cmd+Z', async () => {
      const onUndoElements = jest.fn();
      const history = historyWithRecordedCommand([FIRST_ITEM], [FIRST_ITEM, SECOND_ITEM]);
      renderCanvas(
        [FIRST_ITEM, SECOND_ITEM],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        history,
        onUndoElements,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      canvas.focus();
      await userEvent.setup().keyboard('{Meta>}z{/Meta}');

      expect(onUndoElements).toHaveBeenCalledTimes(1);
      expect(onUndoElements).toHaveBeenCalledWith([FIRST_ITEM]);
    });

    it('does nothing without a history', async () => {
      const onUndoElements = jest.fn();
      renderCanvas(
        [FIRST_ITEM],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        onUndoElements,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      canvas.focus();
      await userEvent.setup().keyboard('{Control>}z{/Control}');

      expect(onUndoElements).not.toHaveBeenCalled();
    });
  });

  describe('redo', () => {
    it('redoes the last undone command on Ctrl+Shift+Z and emits the next state', async () => {
      const onRedoElements = jest.fn();
      const history = historyWithUndoneCommand([FIRST_ITEM], [FIRST_ITEM, SECOND_ITEM]);
      renderCanvas(
        [FIRST_ITEM],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        history,
        undefined,
        onRedoElements,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      canvas.focus();
      await userEvent.setup().keyboard('{Control>}{Shift>}z{/Shift}{/Control}');

      expect(onRedoElements).toHaveBeenCalledTimes(1);
      expect(onRedoElements).toHaveBeenCalledWith([FIRST_ITEM, SECOND_ITEM]);
      expect(history.canRedo()).toBe(false);
    });

    it('redoes on Cmd+Shift+Z', async () => {
      const onRedoElements = jest.fn();
      const history = historyWithUndoneCommand([FIRST_ITEM], [FIRST_ITEM, SECOND_ITEM]);
      renderCanvas(
        [FIRST_ITEM],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        history,
        undefined,
        onRedoElements,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      canvas.focus();
      await userEvent.setup().keyboard('{Meta>}{Shift>}z{/Shift}{/Meta}');

      expect(onRedoElements).toHaveBeenCalledTimes(1);
      expect(onRedoElements).toHaveBeenCalledWith([FIRST_ITEM, SECOND_ITEM]);
    });

    it('redoes on Ctrl+Y', async () => {
      const onRedoElements = jest.fn();
      const history = historyWithUndoneCommand([FIRST_ITEM], [FIRST_ITEM, SECOND_ITEM]);
      renderCanvas(
        [FIRST_ITEM],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        history,
        undefined,
        onRedoElements,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      canvas.focus();
      await userEvent.setup().keyboard('{Control>}y{/Control}');

      expect(onRedoElements).toHaveBeenCalledTimes(1);
      expect(onRedoElements).toHaveBeenCalledWith([FIRST_ITEM, SECOND_ITEM]);
    });

    it('does nothing without a history', async () => {
      const onRedoElements = jest.fn();
      renderCanvas(
        [FIRST_ITEM],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        onRedoElements,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      canvas.focus();
      await userEvent.setup().keyboard('{Control>}{Shift>}z{/Shift}{/Control}');

      expect(onRedoElements).not.toHaveBeenCalled();
    });
  });

  describe('toolbar', () => {
    interface ToolbarCanvasOptions {
      readonly elements?: readonly Element[];
      readonly onCreateElement?: (type: ElementType) => void;
      readonly history?: CommandHistory<readonly Element[]>;
      readonly onUndoElements?: (elements: readonly Element[]) => void;
      readonly onRedoElements?: (elements: readonly Element[]) => void;
      readonly onDeleteElements?: (elements: readonly Element[]) => void;
    }

    function renderToolbarCanvas(options: ToolbarCanvasOptions = {}) {
      const store = createCanvasViewportStore(Size.create(800, 600));
      const selectionStore = createSelectionStore();

      render(
        <Canvas
          store={store}
          selectionStore={selectionStore}
          elements={options.elements}
          onCreateElement={options.onCreateElement}
          history={options.history}
          onUndoElements={options.onUndoElements}
          onRedoElements={options.onRedoElements}
          onDeleteElements={options.onDeleteElements}
        />,
      );

      return { store, selectionStore };
    }

    it('requests the creation of the clicked element type', async () => {
      const onCreateElement = jest.fn();
      renderToolbarCanvas({ onCreateElement });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Add note' }));

      expect(onCreateElement).toHaveBeenCalledWith('note');
    });

    it('enables the connector button only with two selected elements', async () => {
      const onCreateElement = jest.fn();
      const { selectionStore } = renderToolbarCanvas({
        elements: [FIRST_ITEM, SECOND_ITEM],
        onCreateElement,
      });
      const user = userEvent.setup();
      const connector = screen.getByRole('button', { name: 'Connect selected elements' });

      expect(connector).toBeDisabled();

      act(() => {
        selectionStore.selectMany(['first', 'second']);
      });

      expect(connector).toBeEnabled();

      await user.click(connector);

      expect(onCreateElement).toHaveBeenCalledWith('connector');
    });

    it('undoes the last command through the viewport controls button', async () => {
      const onUndoElements = jest.fn();
      const history = historyWithRecordedCommand([FIRST_ITEM], [FIRST_ITEM, SECOND_ITEM]);
      renderToolbarCanvas({
        elements: [FIRST_ITEM, SECOND_ITEM],
        history,
        onUndoElements,
      });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Undo' }));

      expect(onUndoElements).toHaveBeenCalledWith([FIRST_ITEM]);
    });

    it('deletes the selection and clears it through the toolbar button', async () => {
      const onDeleteElements = jest.fn();
      const { selectionStore } = renderToolbarCanvas({
        elements: [FIRST_ITEM, SECOND_ITEM],
        onDeleteElements,
      });
      const user = userEvent.setup();

      act(() => {
        selectionStore.selectMany(['first']);
      });

      await user.click(screen.getByRole('button', { name: 'Delete selection' }));

      expect(onDeleteElements).toHaveBeenCalledWith([SECOND_ITEM]);
      expect(selectionStore.getSnapshot().selectedIds).toEqual([]);
    });

    it('fits the viewport to the board content', async () => {
      const { store } = renderToolbarCanvas({ elements: [FIRST_ITEM, SECOND_ITEM] });
      const user = userEvent.setup();

      expect(store.getSnapshot().transform.scale).toBe(1);

      await user.click(screen.getByRole('button', { name: 'Fit view' }));

      expect(store.getSnapshot().transform.scale).not.toBe(1);
    });

    it('navigates toolbar controls without changing the canvas selection', async () => {
      const { selectionStore } = renderToolbarCanvas({
        elements: [FIRST_ITEM, SECOND_ITEM],
        onCreateElement: jest.fn(),
      });
      const user = userEvent.setup();

      act(() => screen.getByRole('button', { name: 'Add text' }).focus());
      await user.keyboard('{ArrowRight}');

      expect(screen.getByRole('button', { name: 'Add note' })).toHaveFocus();
      expect(selectionStore.getSnapshot().selectedIds).toEqual([]);
      expect(screen.queryByTestId('selection-overlay')).not.toBeInTheDocument();
    });
  });

  describe('focus management', () => {
    it('focuses the canvas when pressing on an empty area', () => {
      renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      fireEvent.pointerDown(canvas, { button: 0 });

      expect(canvas).toHaveFocus();
    });

    it('does not focus the canvas when pressing a toolbar control', () => {
      renderCanvas([FIRST_ITEM, SECOND_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      fireEvent.pointerDown(screen.getByRole('button', { name: 'Fit view' }), { button: 0 });

      expect(canvas).not.toHaveFocus();
    });
  });

  describe('inline editing', () => {
    interface EditableCanvasOptions {
      readonly elements: readonly Element[];
      readonly onUpdateElement?: (input: UpdateElementInput) => void;
      readonly onCreateElement?: (type: ElementType) => ElementId | void;
      readonly readOnly?: boolean;
    }

    function renderEditableCanvas(options: EditableCanvasOptions) {
      const store = createCanvasViewportStore(Size.create(800, 600));
      const selectionStore = createSelectionStore();

      render(
        <Canvas
          store={store}
          selectionStore={selectionStore}
          elements={options.elements}
          onUpdateElement={options.onUpdateElement}
          onCreateElement={options.onCreateElement}
          readOnly={options.readOnly}
        />,
      );

      return { store, selectionStore };
    }

    function AutoEditHarness({
      onUpdateElement,
    }: {
      readonly onUpdateElement: (input: UpdateElementInput) => void;
    }) {
      const store = useMemo(() => createCanvasViewportStore(Size.create(800, 600)), []);
      const selectionStore = useMemo(() => createSelectionStore(), []);
      const [elements, setElements] = useState<readonly Element[]>([]);
      const counterRef = useRef(0);

      const handleCreate = useCallback((): ElementId => {
        counterRef.current += 1;
        const element = createElement(`created-${counterRef.current}`, 100, 100, 100, 60);
        setElements((previous) => [...previous, element]);
        return element.id;
      }, []);

      return (
        <Canvas
          store={store}
          selectionStore={selectionStore}
          elements={elements}
          onUpdateElement={onUpdateElement}
          onCreateElement={handleCreate}
        />
      );
    }

    it('opens the inline editor when double-clicking an element', async () => {
      renderEditableCanvas({ elements: [FIRST_ITEM], onUpdateElement: jest.fn() });

      fireEvent.doubleClick(screen.getByTestId('canvas-item-first'));

      expect(await screen.findByTestId('element-editor')).toHaveValue('hello');
      expect(screen.queryByTestId('selection-overlay')).not.toBeInTheDocument();
    });

    it('positions the editor over the element world bounds', async () => {
      renderEditableCanvas({ elements: [FIRST_ITEM], onUpdateElement: jest.fn() });

      fireEvent.doubleClick(screen.getByTestId('canvas-item-first'));

      const box = await screen.findByTestId('element-editor-box');
      expect(getComputedStyle(box).position).toBe('absolute');
      expect(box.style.left).toBe('100px');
      expect(box.style.top).toBe('100px');
      expect(box.style.width).toBe('120px');
      expect(box.style.height).toBe('80px');
      expect(box).toContainElement(await screen.findByTestId('element-editor'));
    });

    it('opens the editor when the double-click is retargeted to the canvas surface', async () => {
      renderEditableCanvas({ elements: [FIRST_ITEM], onUpdateElement: jest.fn() });

      const item = screen.getByTestId('canvas-item-first');
      const elementFromPoint = jest.fn(() => item);
      Object.defineProperty(document, 'elementFromPoint', {
        configurable: true,
        writable: true,
        value: elementFromPoint,
      });

      try {
        fireEvent.doubleClick(screen.getByRole('application', { name: 'Canvas' }), {
          clientX: 120,
          clientY: 110,
        });

        expect(elementFromPoint).toHaveBeenCalled();
        expect(await screen.findByTestId('element-editor')).toHaveValue('hello');
      } finally {
        delete (document as { elementFromPoint?: unknown }).elementFromPoint;
      }
    });

    it('commits the edited content through onUpdateElement on blur', async () => {
      const user = userEvent.setup();
      const onUpdateElement = jest.fn();
      renderEditableCanvas({ elements: [FIRST_ITEM], onUpdateElement });

      fireEvent.doubleClick(screen.getByTestId('canvas-item-first'));

      const editor = await screen.findByTestId('element-editor');
      await user.clear(editor);
      await user.type(editor, 'updated');
      await user.tab();

      expect(onUpdateElement).toHaveBeenCalledWith({
        type: 'text',
        element: FIRST_ITEM,
        content: richTextFromPlain('updated'),
      });
      expect(screen.queryByTestId('element-editor')).not.toBeInTheDocument();
    });

    it('closes the editor without committing when Escape is pressed', async () => {
      const user = userEvent.setup();
      const onUpdateElement = jest.fn();
      renderEditableCanvas({ elements: [FIRST_ITEM], onUpdateElement });

      fireEvent.doubleClick(screen.getByTestId('canvas-item-first'));

      const editor = await screen.findByTestId('element-editor');
      await user.clear(editor);
      await user.type(editor, 'discarded');
      await user.keyboard('{Escape}');

      expect(onUpdateElement).not.toHaveBeenCalled();
      expect(screen.queryByTestId('element-editor')).not.toBeInTheDocument();
    });

    it('opens the editor on Enter with a single selected element', async () => {
      const user = userEvent.setup();
      const { selectionStore } = renderEditableCanvas({
        elements: [FIRST_ITEM],
        onUpdateElement: jest.fn(),
      });
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      await user.pointer({ keys: '[MouseLeft>]', target: canvas, coords: { x: 150, y: 130 } });
      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first']);

      await user.keyboard('{Enter}');

      expect(await screen.findByTestId('element-editor')).toBeInTheDocument();
    });

    it('does not open the editor when the canvas is read-only', () => {
      renderEditableCanvas({
        elements: [FIRST_ITEM],
        onUpdateElement: jest.fn(),
        readOnly: true,
      });

      fireEvent.doubleClick(screen.getByTestId('canvas-item-first'));

      expect(screen.queryByTestId('element-editor')).not.toBeInTheDocument();
    });

    it('opens the editor for a freshly created element', async () => {
      const user = userEvent.setup();
      render(<AutoEditHarness onUpdateElement={jest.fn()} />);

      await user.click(screen.getByRole('button', { name: 'Add text' }));

      expect(await screen.findByTestId('element-editor')).toBeInTheDocument();
    });
  });
});
