import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Position, ElementId, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import {
  createConnectorElement,
  createNoteElement,
  createTaskElement,
  createTextElement,
  richTextFromPlain,
} from '../../../../../domain/element';
import type { Element, ElementType, TaskElement } from '../../../../../domain/element';
import { NOTE_COLOR_PALETTE } from '../../../../../presentation/canvas/note-colors';
import {
  createCanvasViewportStore,
  createCommandHistory,
  createSelectionStore,
} from '../../../../../application/services';
import type { CommandHistory } from '../../../../../application/services';
import { createFunctionCommand } from '../../../../../application/commands';
import type { UpdateElementInput } from '../../../../../application/commands';
import { Canvas } from '../../../../../presentation/canvas/components/canvas';
import { installDragEventPolyfill } from '../../../../fixtures/drag-event';

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

function createNote(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color?: string,
): Element {
  return createNoteElement({
    id: ElementId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(x, y),
    size: Size.create(width, height),
    content: 'note',
    ...(color === undefined ? {} : { color }),
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
  onAlignElements?: (next: readonly Element[]) => void,
  onDistributeElements?: (next: readonly Element[]) => void,
  onRotateElements?: (next: readonly Element[]) => void,
) {
  const store = createCanvasViewportStore(Size.create(800, 600));
  const selectionStore = createSelectionStore();

  const { container } = render(
    <Canvas
      store={store}
      selectionStore={selectionStore}
      elements={elements}
      onMoveElements={onMoveElements}
      onResizeElements={onResizeElements}
      onRotateElements={onRotateElements}
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
      onAlignElements={onAlignElements}
      onDistributeElements={onDistributeElements}
    />,
  );

  return { store, selectionStore, container };
}

interface RotationCanvasOptions {
  readonly elements: readonly Element[];
  readonly onRotateElements?: (next: readonly Element[]) => void;
  readonly onTransformEnd?: () => void;
  readonly readOnly?: boolean;
}

function renderRotationCanvas({
  elements,
  onRotateElements,
  onTransformEnd,
  readOnly = false,
}: RotationCanvasOptions) {
  const store = createCanvasViewportStore(Size.create(800, 600));
  const selectionStore = createSelectionStore();

  render(
    <Canvas
      store={store}
      selectionStore={selectionStore}
      elements={elements}
      onRotateElements={onRotateElements}
      onTransformEnd={onTransformEnd}
      readOnly={readOnly}
    />,
  );

  return { store, selectionStore };
}

interface ArrangeCanvasOptions {
  readonly elements: readonly Element[];
  readonly onAlignElements?: (next: readonly Element[]) => void;
  readonly onDistributeElements?: (next: readonly Element[]) => void;
  readonly readOnly?: boolean;
}

function renderArrangeCanvas({
  elements,
  onAlignElements,
  onDistributeElements,
  readOnly = false,
}: ArrangeCanvasOptions) {
  const store = createCanvasViewportStore(Size.create(800, 600));
  const selectionStore = createSelectionStore();

  render(
    <Canvas
      store={store}
      selectionStore={selectionStore}
      elements={elements}
      onAlignElements={onAlignElements}
      onDistributeElements={onDistributeElements}
      readOnly={readOnly}
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

const THIRD_ITEM = createElement('third', 700, 400, 80, 60);

function createTask(
  id: string,
  options: {
    readonly title?: string;
    readonly status?: 'todo' | 'in_progress';
    readonly notes?: string;
    readonly assigneeId?: string;
    readonly dueDate?: Date;
  } = {},
): TaskElement {
  return createTaskElement({
    id: ElementId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(100, 100),
    size: Size.create(120, 80),
    title: options.title ?? 'Draft spec',
    status: options.status ?? 'todo',
    notes: options.notes,
    assigneeId: options.assigneeId === undefined ? undefined : UserId.create(options.assigneeId),
    dueDate: options.dueDate,
  });
}

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
        'Arrow keys to move selection · Shift + Arrow to extend selection · Drag on empty canvas to pan · Shift + drag to select · Space + drag or middle-drag to pan · Ctrl/Cmd + scroll to zoom · Esc to clear · Ctrl/Cmd + A to select all · Delete to remove · Ctrl/Cmd + D to duplicate · Ctrl/Cmd + C to copy · Ctrl/Cmd + V to paste · Ctrl/Cmd + Z to undo · Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y to redo · Ctrl/Cmd + ] to bring to front · Ctrl/Cmd + [ to send to back · Right-click an object for more options',
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

  it('hides element type labels in presentation mode', () => {
    const store = createCanvasViewportStore(Size.create(800, 600));
    const selectionStore = createSelectionStore();

    render(
      <Canvas store={store} selectionStore={selectionStore} elements={[FIRST_ITEM]} presentation />,
    );

    expect(screen.queryByTestId('element-type-label-first')).not.toBeInTheDocument();
  });

  it('renders element type labels in the normal editor', () => {
    renderCanvas([FIRST_ITEM]);

    expect(screen.getByTestId('element-type-label-first')).toHaveTextContent('Text');
  });

  it('renders an inert paper texture behind the canvas content', () => {
    const { container } = renderCanvas([]);
    const texture = container.querySelector('.cach-paper-texture');

    expect(texture).not.toBeNull();
    expect(texture).toHaveAttribute('aria-hidden', 'true');
  });

  it('illustrates the empty board state with inert brand decoration', () => {
    renderCanvas([]);

    const illustration = screen.getByTestId('state-illustration');
    expect(illustration).toHaveAttribute('aria-hidden', 'true');
  });

  it('offers a CTA to add the first note when the board is empty', () => {
    const store = createCanvasViewportStore(Size.create(800, 600));
    const selectionStore = createSelectionStore();
    const onCreateElement = jest.fn();

    render(
      <Canvas
        store={store}
        selectionStore={selectionStore}
        elements={[]}
        onCreateElement={onCreateElement}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add a note' }));

    expect(onCreateElement).toHaveBeenCalledWith('note');
  });

  it('hides the empty board CTA in read-only mode', () => {
    const store = createCanvasViewportStore(Size.create(800, 600));
    const selectionStore = createSelectionStore();

    render(
      <Canvas
        store={store}
        selectionStore={selectionStore}
        elements={[]}
        onCreateElement={jest.fn()}
        readOnly
      />,
    );

    expect(screen.queryByRole('button', { name: 'Add a note' })).not.toBeInTheDocument();
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

  it('pans the viewport when dragging empty space with the left button', async () => {
    renderCanvas();
    const canvas = screen.getByRole('application', { name: 'Canvas' });
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { x: 600, y: 450 } },
      { coords: { x: 650, y: 475 } },
    ]);

    expect(canvas).toHaveAttribute('data-panning', 'true');
    expect(screen.getByTestId('canvas-world').style.transform).toContain('translate(50px, 25px)');

    await user.pointer({ keys: '[/MouseLeft]' });

    expect(canvas).toHaveAttribute('data-panning', 'false');
  });

  it('does not pan when dragging an element', async () => {
    renderCanvas([FIRST_ITEM]);
    const canvas = screen.getByRole('application', { name: 'Canvas' });
    const item = screen.getByTestId('canvas-item-first');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: item, coords: { x: 150, y: 130 } },
      { coords: { x: 250, y: 230 } },
    ]);

    expect(canvas).toHaveAttribute('data-panning', 'false');
    expect(screen.getByTestId('canvas-world').style.transform).toContain('translate(0px, 0px)');
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

      await user.keyboard('{Shift>}');
      await user.pointer([
        { keys: '[MouseLeft>]', target: canvas, coords: { x: 0, y: 0 } },
        { coords: { x: 450, y: 350 } },
        { keys: '[/MouseLeft]' },
      ]);
      await user.keyboard('{/Shift}');

      expect(selectionStore.getSnapshot().selectedIds).toEqual(['first', 'second']);
      expect(screen.getByTestId('canvas-item-first')).toHaveAttribute('data-selected', 'true');
      expect(screen.getByTestId('canvas-item-second')).toHaveAttribute('data-selected', 'true');
      expect(screen.getByTestId('selection-overlay')).toHaveAttribute('data-selection-count', '2');
    });

    it('renders the marquee rectangle while dragging and removes it after', async () => {
      renderCanvas([FIRST_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      await user.keyboard('{Shift>}');
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
      await user.keyboard('{/Shift}');

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

  describe('alignment and distribution', () => {
    it('aligns the selected items from the toolbar', async () => {
      const onAlignElements = jest.fn();
      const user = userEvent.setup();
      const { selectionStore } = renderArrangeCanvas({
        elements: [FIRST_ITEM, SECOND_ITEM],
        onAlignElements,
      });

      act(() => selectionStore.selectMany(['first', 'second']));
      await user.click(screen.getByRole('button', { name: 'Align and distribute' }));
      await user.click(screen.getByRole('menuitem', { name: 'Align left' }));

      expect(onAlignElements).toHaveBeenCalledTimes(1);
      const arranged: readonly Element[] = onAlignElements.mock.calls[0][0];
      expect(arranged.map((element) => element.position.x)).toEqual([100, 100]);
      expect(arranged.map((element) => element.position.y)).toEqual([100, 200]);
      expect(arranged.map((element) => element.size.width)).toEqual([120, 100]);
    });

    it('distributes the selected items from the toolbar', async () => {
      const onDistributeElements = jest.fn();
      const user = userEvent.setup();
      const { selectionStore } = renderArrangeCanvas({
        elements: [FIRST_ITEM, SECOND_ITEM, THIRD_ITEM],
        onAlignElements: jest.fn(),
        onDistributeElements,
      });

      act(() => selectionStore.selectMany(['first', 'second', 'third']));
      await user.click(screen.getByRole('button', { name: 'Align and distribute' }));
      await user.click(screen.getByRole('menuitem', { name: 'Distribute horizontally' }));

      expect(onDistributeElements).toHaveBeenCalledTimes(1);
      const distributed: readonly Element[] = onDistributeElements.mock.calls[0][0];
      expect(distributed.map((element) => element.position.x)).toEqual([100, 410, 700]);
    });

    it('only enables distribution with three selected items', async () => {
      const user = userEvent.setup();
      const { selectionStore } = renderArrangeCanvas({
        elements: [FIRST_ITEM, SECOND_ITEM, THIRD_ITEM],
        onAlignElements: jest.fn(),
        onDistributeElements: jest.fn(),
      });

      act(() => selectionStore.selectMany(['first', 'second']));
      await user.click(screen.getByRole('button', { name: 'Align and distribute' }));

      expect(screen.getByRole('menuitem', { name: 'Distribute horizontally' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('disables arrangement in read-only mode', () => {
      const { selectionStore } = renderArrangeCanvas({
        elements: [FIRST_ITEM, SECOND_ITEM],
        onAlignElements: jest.fn(),
        onDistributeElements: jest.fn(),
        readOnly: true,
      });

      act(() => selectionStore.selectMany(['first', 'second']));

      expect(screen.getByRole('button', { name: 'Align and distribute' })).toBeDisabled();
    });

    it('ignores connectors when deciding whether arrangement is available', async () => {
      const user = userEvent.setup();
      const connector = createConnectorElement({
        id: ElementId.create('connector'),
        workspaceId: WorkspaceId.create('ws-1'),
        createdBy: UserId.create('user-1'),
        position: Position.create(100, 100),
        size: Size.create(100, 40),
        sourcePoint: Position.create(0, 0),
        targetPoint: Position.create(100, 40),
      });
      const { selectionStore } = renderArrangeCanvas({
        elements: [FIRST_ITEM, connector],
        onAlignElements: jest.fn(),
      });

      act(() => selectionStore.selectMany(['first', 'connector']));
      await user.click(screen.getByRole('button', { name: 'Align and distribute' }));

      expect(screen.getByRole('button', { name: 'Align and distribute' })).toBeDisabled();
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

  describe('rotating', () => {
    it('rotates the single selected item when dragging the rotation handle', async () => {
      const calls: (readonly Element[])[] = [];
      const onRotateElements = jest.fn((next: readonly Element[]) => {
        calls.push(next);
      });
      const onTransformEnd = jest.fn();
      const { selectionStore } = renderRotationCanvas({
        elements: [FIRST_ITEM],
        onRotateElements,
        onTransformEnd,
      });
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      act(() => {
        selectionStore.select('first');
      });

      const handle = screen.getByTestId('rotate-handle');
      const user = userEvent.setup();

      await user.pointer([
        { keys: '[MouseLeft>]', target: handle, coords: { x: 160, y: 100 } },
        { coords: { x: 200, y: 140 } },
      ]);

      expect(canvas).toHaveAttribute('data-rotating', 'true');
      expect(calls.at(-1)?.[0]?.rotation).toBeCloseTo(90);

      await user.pointer({ keys: '[/MouseLeft]' });

      expect(canvas).toHaveAttribute('data-rotating', 'false');
      expect(onTransformEnd).toHaveBeenCalledTimes(1);
    });

    it('does not offer the rotation handle when rotation is not wired', () => {
      const { selectionStore } = renderRotationCanvas({ elements: [FIRST_ITEM] });

      act(() => {
        selectionStore.select('first');
      });

      expect(screen.queryByTestId('rotate-handle')).not.toBeInTheDocument();
    });

    it('does not offer the rotation handle in read-only mode', () => {
      const { selectionStore } = renderRotationCanvas({
        elements: [FIRST_ITEM],
        onRotateElements: jest.fn(),
        readOnly: true,
      });

      act(() => {
        selectionStore.select('first');
      });

      expect(screen.queryByTestId('rotate-handle')).not.toBeInTheDocument();
    });

    it('does not offer the rotation handle for a connector', () => {
      const connector = createConnectorElement({
        id: ElementId.create('connector'),
        workspaceId: WorkspaceId.create('ws-1'),
        createdBy: UserId.create('user-1'),
        position: Position.create(100, 100),
        size: Size.create(100, 40),
        sourcePoint: Position.create(0, 0),
        targetPoint: Position.create(100, 40),
      });
      const { selectionStore } = renderRotationCanvas({
        elements: [connector],
        onRotateElements: jest.fn(),
      });

      act(() => {
        selectionStore.select('connector');
      });

      expect(screen.queryByTestId('rotate-handle')).not.toBeInTheDocument();
    });

    it('does not offer the rotation handle for a multi selection', () => {
      const { selectionStore } = renderRotationCanvas({
        elements: [FIRST_ITEM, SECOND_ITEM],
        onRotateElements: jest.fn(),
      });

      act(() => {
        selectionStore.selectMany(['first', 'second']);
      });

      expect(screen.queryByTestId('rotate-handle')).not.toBeInTheDocument();
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

  describe('clipboard paste', () => {
    function clipboardData(files: readonly File[] = [], text = '') {
      return {
        files,
        getData: (format: string) => (format === 'text/plain' ? text : ''),
      };
    }

    function renderPasteCanvas(props: {
      readonly onPasteText?: (text: string, position?: Position) => void;
      readonly onUploadImage?: (
        file: File,
        position?: Position,
      ) => Promise<ElementId | void> | ElementId | void;
      readonly readOnly?: boolean;
    }) {
      const store = createCanvasViewportStore(Size.create(800, 600));
      const selectionStore = createSelectionStore();

      render(<Canvas store={store} selectionStore={selectionStore} {...props} />);

      return screen.getByRole('application', { name: 'Canvas' });
    }

    it('creates text at the viewport centre on paste', () => {
      const onPasteText = jest.fn();
      const canvas = renderPasteCanvas({ onPasteText });

      const notPrevented = fireEvent.paste(canvas, {
        clipboardData: clipboardData([], 'Hello\nWorld'),
      });

      expect(notPrevented).toBe(false);
      expect(onPasteText).toHaveBeenCalledWith(
        'Hello\nWorld',
        expect.objectContaining({ x: 320, y: 280 }),
      );
    });

    it('forwards a pasted image with the default image size position', () => {
      const onUploadImage = jest.fn();
      const file = new File(['image'], 'screenshot.png', { type: 'image/png' });
      const canvas = renderPasteCanvas({ onUploadImage });

      fireEvent.paste(canvas, { clipboardData: clipboardData([file]) });

      expect(onUploadImage).toHaveBeenCalledWith(file, expect.objectContaining({ x: 240, y: 200 }));
    });

    it('does not accept pasted content in read-only mode', () => {
      const onPasteText = jest.fn();
      const canvas = renderPasteCanvas({ onPasteText, readOnly: true });

      fireEvent.paste(canvas, { clipboardData: clipboardData([], 'Hello') });

      expect(onPasteText).not.toHaveBeenCalled();
    });

    it('does not intercept paste inside a contenteditable element', () => {
      const onPasteText = jest.fn();
      const canvas = renderPasteCanvas({ onPasteText });
      const editable = document.createElement('div');
      editable.setAttribute('contenteditable', 'true');
      canvas.appendChild(editable);

      const notPrevented = fireEvent.paste(editable, {
        clipboardData: clipboardData([], 'Hello'),
      });

      expect(notPrevented).toBe(true);
      expect(onPasteText).not.toHaveBeenCalled();
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

    it('applies a note color from the context menu', async () => {
      const note = createNote('note-1', 100, 100, 120, 80);
      const onUpdateElement = jest.fn();
      renderCanvas(
        [note],
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
        onUpdateElement,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      fireEvent.contextMenu(canvas, { clientX: 150, clientY: 130 });

      const noteColor = await screen.findByRole('menuitem', { name: 'Note color' });
      await user.hover(noteColor);

      await user.click(await screen.findByRole('menuitem', { name: 'Green' }));

      expect(onUpdateElement).toHaveBeenCalledWith({
        type: 'note',
        element: note,
        color: NOTE_COLOR_PALETTE[0].color,
      });
    });

    it('resets a note color to the default from the context menu', async () => {
      const color = NOTE_COLOR_PALETTE[1].color;
      const note = createNote('note-1', 100, 100, 120, 80, color);
      const onUpdateElement = jest.fn();
      renderCanvas(
        [note],
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
        onUpdateElement,
      );
      const canvas = screen.getByRole('application', { name: 'Canvas' });
      const user = userEvent.setup();

      fireEvent.contextMenu(canvas, { clientX: 150, clientY: 130 });

      const noteColor = await screen.findByRole('menuitem', { name: 'Note color' });
      await user.hover(noteColor);

      await user.click(await screen.findByRole('menuitem', { name: 'Default' }));

      expect(onUpdateElement).toHaveBeenCalledWith({
        type: 'note',
        element: note,
        color: null,
      });
    });

    it('does not offer note colors for non-note elements', async () => {
      renderCanvas([FIRST_ITEM]);
      const canvas = screen.getByRole('application', { name: 'Canvas' });

      fireEvent.contextMenu(canvas, { clientX: 150, clientY: 130 });

      expect(await screen.findByRole('menuitem', { name: 'Bring to front' })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Note color' })).not.toBeInTheDocument();
    });

    it('creates a task from a note through the context menu', async () => {
      const note = createNote('note-1', 100, 100, 120, 80);
      const onCreateTaskFromElement = jest.fn();
      const user = userEvent.setup();

      render(
        <Canvas
          store={createCanvasViewportStore(Size.create(800, 600))}
          selectionStore={createSelectionStore()}
          elements={[note]}
          onCreateTaskFromElement={onCreateTaskFromElement}
        />,
      );

      const canvas = screen.getByRole('application', { name: 'Canvas' });

      fireEvent.contextMenu(canvas, { clientX: 150, clientY: 130 });
      await user.click(screen.getByRole('menuitem', { name: 'Create task from note' }));

      expect(onCreateTaskFromElement).toHaveBeenCalledWith(note);
    });

    it('disables task creation when the note has no usable text', async () => {
      const emptyNote = createNoteElement({
        id: ElementId.create('note-1'),
        workspaceId: WorkspaceId.create('ws-1'),
        createdBy: UserId.create('user-1'),
        position: Position.create(100, 100),
        size: Size.create(120, 80),
        content: '   ',
      });
      const onCreateTaskFromElement = jest.fn();
      const user = userEvent.setup();

      render(
        <Canvas
          store={createCanvasViewportStore(Size.create(800, 600))}
          selectionStore={createSelectionStore()}
          elements={[emptyNote]}
          onCreateTaskFromElement={onCreateTaskFromElement}
        />,
      );

      const canvas = screen.getByRole('application', { name: 'Canvas' });

      fireEvent.contextMenu(canvas, { clientX: 150, clientY: 130 });

      const item = screen.getByRole('menuitem', { name: 'Create task from note' });
      expect(item).toHaveAttribute('aria-disabled', 'true');

      await user.click(item);

      expect(onCreateTaskFromElement).not.toHaveBeenCalled();
    });

    it('does not offer task creation from elements that are not notes or frames', async () => {
      render(
        <Canvas
          store={createCanvasViewportStore(Size.create(800, 600))}
          selectionStore={createSelectionStore()}
          elements={[FIRST_ITEM]}
          onCreateTaskFromElement={jest.fn()}
        />,
      );

      const canvas = screen.getByRole('application', { name: 'Canvas' });

      fireEvent.contextMenu(canvas, { clientX: 150, clientY: 130 });

      expect(await screen.findByRole('menuitem', { name: 'Bring to front' })).toBeInTheDocument();
      expect(
        screen.queryByRole('menuitem', { name: 'Create task from note' }),
      ).not.toBeInTheDocument();
    });

    it('does not open the context menu for task creation in read-only mode', () => {
      render(
        <Canvas
          store={createCanvasViewportStore(Size.create(800, 600))}
          selectionStore={createSelectionStore()}
          elements={[createNote('note-1', 100, 100, 120, 80)]}
          onCreateTaskFromElement={jest.fn()}
          readOnly
        />,
      );

      const canvas = screen.getByRole('application', { name: 'Canvas' });

      fireEvent.contextMenu(canvas, { clientX: 150, clientY: 130 });

      expect(
        screen.queryByRole('menuitem', { name: 'Create task from note' }),
      ).not.toBeInTheDocument();
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
      readonly onCreateConnector?: (mode: 'free' | 'bound') => void;
      readonly onUploadImage?: (file: File) => Promise<ElementId | void> | ElementId | void;
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
          onUploadImage={options.onUploadImage}
          onCreateConnector={options.onCreateConnector}
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

    it('opens the image picker and forwards the selected file', async () => {
      const onUploadImage = jest.fn();
      renderToolbarCanvas({ onUploadImage });
      const user = userEvent.setup();
      const file = new File(['image'], 'diagram.png', { type: 'image/png' });

      await user.upload(screen.getByTestId('image-file-input'), file);

      expect(onUploadImage).toHaveBeenCalledWith(file);
      expect(screen.getByRole('button', { name: 'Add image' })).toBeEnabled();
    });

    it('hides image creation when no upload handler is available', () => {
      renderToolbarCanvas();

      expect(screen.getByRole('button', { name: 'Add image' })).toBeDisabled();
    });

    it('enables the connect-selected button only with two selected elements', async () => {
      const onCreateConnector = jest.fn();
      const { selectionStore } = renderToolbarCanvas({
        elements: [FIRST_ITEM, SECOND_ITEM],
        onCreateConnector,
      });
      const user = userEvent.setup();
      const connector = screen.getByRole('button', { name: 'Connect selected elements' });

      expect(connector).toBeDisabled();

      act(() => {
        selectionStore.selectMany(['first', 'second']);
      });

      expect(connector).toBeEnabled();

      await user.click(connector);

      expect(onCreateConnector).toHaveBeenCalledWith('bound');
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
      await user.keyboard('{ArrowDown}');

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

  describe('task form', () => {
    interface TaskFormCanvasOptions {
      readonly elements?: readonly Element[];
      readonly onCreateTask?: (values: {
        title: string;
        status: 'todo' | 'in_progress' | 'completed' | 'blocked';
        notes: string;
        assigneeId: string;
        dueDate: string;
      }) => ElementId | void;
      readonly assignees?: readonly {
        readonly userId: string;
        readonly label: string;
      }[];
      readonly onUpdateElement?: (input: UpdateElementInput) => void;
      readonly readOnly?: boolean;
    }

    function renderTaskFormCanvas(options: TaskFormCanvasOptions = {}) {
      render(
        <Canvas
          store={createCanvasViewportStore(Size.create(800, 600))}
          selectionStore={createSelectionStore()}
          elements={options.elements}
          onCreateTask={options.onCreateTask}
          assignees={options.assignees}
          onUpdateElement={options.onUpdateElement}
          readOnly={options.readOnly}
        />,
      );
    }

    function fillTitle(title: string): void {
      fireEvent.change(screen.getByLabelText('Title'), { target: { value: title } });
    }

    function submitCreate(): void {
      fireEvent.click(screen.getByRole('button', { name: 'Create task' }));
    }

    function selectStatus(label: string): void {
      fireEvent.click(screen.getByRole('combobox', { name: 'Status' }));
      fireEvent.click(screen.getByRole('option', { name: label }));
    }

    function selectAssignee(label: string): void {
      fireEvent.click(screen.getByRole('combobox', { name: 'Assignee' }));
      fireEvent.click(screen.getByRole('option', { name: label }));
    }

    it('opens the create dialog from the toolbar without creating anything yet', () => {
      const onCreateTask = jest.fn();
      renderTaskFormCanvas({ onCreateTask });

      fireEvent.click(screen.getByRole('button', { name: 'Add task' }));

      expect(screen.getByRole('heading', { level: 2, name: 'New task' })).toBeInTheDocument();
      expect(onCreateTask).not.toHaveBeenCalled();
    });

    it('creates the task with the form values and closes the dialog', () => {
      const onCreateTask = jest.fn();
      renderTaskFormCanvas({ onCreateTask });

      fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
      fillTitle('Ship the MVP');
      fireEvent.click(screen.getByRole('combobox', { name: 'Status' }));
      fireEvent.click(screen.getByRole('option', { name: 'In progress' }));
      fireEvent.change(screen.getByLabelText('Notes'), {
        target: { value: 'Wait for review' },
      });
      submitCreate();

      expect(onCreateTask).toHaveBeenCalledWith({
        title: 'Ship the MVP',
        status: 'in_progress',
        notes: 'Wait for review',
        assigneeId: '',
        dueDate: '',
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('creates the task with an assignee and due date', () => {
      const onCreateTask = jest.fn();
      renderTaskFormCanvas({
        onCreateTask,
        assignees: [
          { userId: 'user-1', label: 'Ada Lovelace' },
          { userId: 'user-2', label: 'Grace Hopper' },
        ],
      });

      fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
      fillTitle('Ship the MVP');
      selectAssignee('Grace Hopper');
      fireEvent.change(screen.getByLabelText('Due date'), {
        target: { value: '2026-03-15' },
      });
      submitCreate();

      expect(onCreateTask).toHaveBeenCalledWith({
        title: 'Ship the MVP',
        status: 'todo',
        notes: '',
        assigneeId: 'user-2',
        dueDate: '2026-03-15',
      });
    });

    it('clears the assignee and due date from the edit dialog', () => {
      const task = createTask('task-1', {
        assigneeId: 'user-2',
        dueDate: new Date('2026-03-15T00:00:00.000Z'),
      });
      const onUpdateElement = jest.fn();
      renderTaskFormCanvas({
        elements: [task],
        onUpdateElement,
        assignees: [{ userId: 'user-2', label: 'Grace Hopper' }],
      });

      fireEvent.doubleClick(screen.getByTestId('canvas-item-task-1'));
      selectAssignee('Unassigned');
      fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(onUpdateElement).toHaveBeenCalledWith({
        type: 'task',
        element: task,
        assigneeId: null,
        dueDate: null,
      });
    });

    it('does not create the task when the title is empty', () => {
      const onCreateTask = jest.fn();
      renderTaskFormCanvas({ onCreateTask });

      fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
      fillTitle('   ');
      submitCreate();

      expect(onCreateTask).not.toHaveBeenCalled();
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });

    it('opens the edit dialog pre-filled when double-clicking a task', () => {
      const task = createTask('task-1', { status: 'in_progress', notes: 'Draft notes' });
      renderTaskFormCanvas({ elements: [task], onUpdateElement: jest.fn() });

      fireEvent.doubleClick(screen.getByTestId('canvas-item-task-1'));

      expect(screen.getByRole('heading', { level: 2, name: 'Edit task' })).toBeInTheDocument();
      expect(screen.getByLabelText('Title')).toHaveValue('Draft spec');
      expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('In progress');
      expect(screen.getByLabelText('Notes')).toHaveValue('Draft notes');
      expect(screen.queryByTestId('element-editor')).not.toBeInTheDocument();
    });

    it('commits only the changed fields on save', () => {
      const task = createTask('task-1', { status: 'in_progress', notes: 'Draft notes' });
      const onUpdateElement = jest.fn();
      renderTaskFormCanvas({ elements: [task], onUpdateElement });

      fireEvent.doubleClick(screen.getByTestId('canvas-item-task-1'));
      fillTitle('Final spec');
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(onUpdateElement).toHaveBeenCalledWith({
        type: 'task',
        element: task,
        title: 'Final spec',
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('commits the status changed from the edit dialog', () => {
      const task = createTask('task-1', { status: 'in_progress', notes: 'Draft notes' });
      const onUpdateElement = jest.fn();
      renderTaskFormCanvas({ elements: [task], onUpdateElement });

      fireEvent.doubleClick(screen.getByTestId('canvas-item-task-1'));
      selectStatus('Completed');
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(onUpdateElement).toHaveBeenCalledWith({
        type: 'task',
        element: task,
        status: 'completed',
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('clears the notes when they are emptied', () => {
      const task = createTask('task-1', { notes: 'Draft notes' });
      const onUpdateElement = jest.fn();
      renderTaskFormCanvas({ elements: [task], onUpdateElement });

      fireEvent.doubleClick(screen.getByTestId('canvas-item-task-1'));
      fireEvent.change(screen.getByLabelText('Notes'), { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(onUpdateElement).toHaveBeenCalledWith({
        type: 'task',
        element: task,
        notes: null,
      });
    });

    it('does not call onUpdateElement when nothing changed', () => {
      const task = createTask('task-1', { notes: 'Draft notes' });
      const onUpdateElement = jest.fn();
      renderTaskFormCanvas({ elements: [task], onUpdateElement });

      fireEvent.doubleClick(screen.getByTestId('canvas-item-task-1'));
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(onUpdateElement).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes the edit dialog through cancel without committing', () => {
      const task = createTask('task-1');
      const onUpdateElement = jest.fn();
      renderTaskFormCanvas({ elements: [task], onUpdateElement });

      fireEvent.doubleClick(screen.getByTestId('canvas-item-task-1'));
      fillTitle('Discarded title');
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onUpdateElement).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not open the task dialog when the canvas is read-only', () => {
      const task = createTask('task-1');
      renderTaskFormCanvas({ elements: [task], onUpdateElement: jest.fn(), readOnly: true });

      fireEvent.doubleClick(screen.getByTestId('canvas-item-task-1'));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});

describe('Canvas connector endpoints', () => {
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

  function createFreeConnector() {
    return createConnectorElement({
      id: ElementId.create('free-connector'),
      workspaceId: WorkspaceId.create('ws-1'),
      createdBy: UserId.create('user-1'),
      position: Position.create(100, 100),
      size: Size.create(160, 40),
      sourcePoint: Position.create(0, 20),
      targetPoint: Position.create(160, 20),
    });
  }

  it('renders endpoint handles for a selected free connector', () => {
    const connector = createFreeConnector();
    const store = createCanvasViewportStore(Size.create(800, 600));
    const selectionStore = createSelectionStore();
    render(<Canvas store={store} selectionStore={selectionStore} elements={[connector]} />);

    act(() => {
      selectionStore.select('free-connector');
    });

    expect(document.querySelectorAll('[data-connector-endpoint]')).toHaveLength(2);
    expect(document.querySelector('[data-resize-handle]')).toBeNull();
  });

  it('reports endpoint drags in world coordinates', async () => {
    const connector = createFreeConnector();
    const onUpdateConnectorEndpoint = jest.fn();
    const user = userEvent.setup();
    const store = createCanvasViewportStore(Size.create(800, 600));
    const selectionStore = createSelectionStore();

    render(
      <Canvas
        store={store}
        selectionStore={selectionStore}
        elements={[connector]}
        onUpdateConnectorEndpoint={onUpdateConnectorEndpoint}
      />,
    );

    act(() => {
      selectionStore.select('free-connector');
    });

    const handle = document.querySelector('[data-connector-endpoint-side="target"]');

    expect(handle).not.toBeNull();

    const canvas = screen.getByRole('application', { name: 'Canvas' });

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle as HTMLElement, coords: { x: 260, y: 120 } },
      { target: canvas, coords: { x: 300, y: 180 } },
      { keys: '[/MouseLeft]', target: canvas, coords: { x: 300, y: 180 } },
    ]);

    expect(onUpdateConnectorEndpoint).toHaveBeenCalledWith({
      element: connector,
      side: 'target',
      point: expect.objectContaining({ x: 300, y: 180 }),
    });
  });
});

describe('Canvas image drag and drop', () => {
  beforeAll(() => {
    installDragEventPolyfill();
  });

  function createDataTransfer(
    files: readonly File[],
    types: readonly string[] = ['Files'],
  ): DataTransfer {
    return {
      files,
      types,
      items: files.map((file) => ({ kind: 'file', type: file.type, getAsFile: () => file })),
      dropEffect: 'none',
      effectAllowed: 'all',
      setData: jest.fn(),
      getData: jest.fn(),
      clearData: jest.fn(),
      setDragImage: jest.fn(),
    } as unknown as DataTransfer;
  }

  function renderDropCanvas(
    onUploadImage: (
      file: File,
      position?: Position,
    ) => Promise<ElementId | void> | ElementId | void,
    readOnly = false,
  ) {
    const store = createCanvasViewportStore(Size.create(800, 600));
    const selectionStore = createSelectionStore();

    render(
      <Canvas
        store={store}
        selectionStore={selectionStore}
        onUploadImage={onUploadImage}
        readOnly={readOnly}
      />,
    );

    return screen.getByRole('application', { name: 'Canvas' });
  }

  it('shows the drop overlay only while a compatible image is dragged', () => {
    const canvas = renderDropCanvas(jest.fn());
    const dataTransfer = createDataTransfer([
      new File(['image'], 'diagram.png', { type: 'image/png' }),
    ]);

    fireEvent.dragEnter(canvas, { dataTransfer });

    expect(screen.getByTestId('canvas-drop-overlay')).toBeInTheDocument();
    expect(canvas).toHaveAttribute('data-drop-active', 'true');

    fireEvent.dragLeave(canvas, { dataTransfer });

    expect(screen.queryByTestId('canvas-drop-overlay')).not.toBeInTheDocument();
    expect(canvas).toHaveAttribute('data-drop-active', 'false');
  });

  it('uploads the dropped image at the drop position', () => {
    const onUploadImage = jest.fn();
    const canvas = renderDropCanvas(onUploadImage);
    const file = new File(['image'], 'diagram.png', { type: 'image/png' });
    const dataTransfer = createDataTransfer([file]);

    fireEvent.dragEnter(canvas, { dataTransfer });
    fireEvent.dragOver(canvas, { dataTransfer });
    fireEvent.drop(canvas, { dataTransfer, clientX: 400, clientY: 300 });

    expect(onUploadImage).toHaveBeenCalledTimes(1);
    expect(onUploadImage).toHaveBeenCalledWith(file, expect.objectContaining({ x: 240, y: 200 }));
    expect(screen.queryByTestId('canvas-drop-overlay')).not.toBeInTheDocument();
  });

  it('forwards an unsupported file to reuse the existing validation error', () => {
    const onUploadImage = jest.fn();
    const canvas = renderDropCanvas(onUploadImage);
    const file = new File(['pdf'], 'document.pdf', { type: 'application/pdf' });
    const dataTransfer = createDataTransfer([file]);

    fireEvent.dragEnter(canvas, { dataTransfer });

    expect(screen.queryByTestId('canvas-drop-overlay')).not.toBeInTheDocument();

    fireEvent.drop(canvas, { dataTransfer, clientX: 400, clientY: 300 });

    expect(onUploadImage).toHaveBeenCalledWith(file, expect.objectContaining({ x: 240, y: 200 }));
  });

  it('ignores drags that do not contain files', () => {
    const onUploadImage = jest.fn();
    const canvas = renderDropCanvas(onUploadImage);
    const dataTransfer = createDataTransfer([], ['text/plain']);

    fireEvent.dragEnter(canvas, { dataTransfer });
    fireEvent.drop(canvas, { dataTransfer, clientX: 400, clientY: 300 });

    expect(screen.queryByTestId('canvas-drop-overlay')).not.toBeInTheDocument();
    expect(onUploadImage).not.toHaveBeenCalled();
  });

  it('only uploads the first file when several are dropped', () => {
    const onUploadImage = jest.fn();
    const canvas = renderDropCanvas(onUploadImage);
    const first = new File(['image'], 'first.png', { type: 'image/png' });
    const second = new File(['image'], 'second.png', { type: 'image/png' });
    const dataTransfer = createDataTransfer([first, second]);

    fireEvent.drop(canvas, { dataTransfer, clientX: 400, clientY: 300 });

    expect(onUploadImage).toHaveBeenCalledTimes(1);
    expect(onUploadImage).toHaveBeenCalledWith(first, expect.anything());
  });

  it('does not accept drops in read-only mode', () => {
    const onUploadImage = jest.fn();
    const canvas = renderDropCanvas(onUploadImage, true);
    const dataTransfer = createDataTransfer([
      new File(['image'], 'diagram.png', { type: 'image/png' }),
    ]);

    fireEvent.dragEnter(canvas, { dataTransfer });
    fireEvent.drop(canvas, { dataTransfer, clientX: 400, clientY: 300 });

    expect(screen.queryByTestId('canvas-drop-overlay')).not.toBeInTheDocument();
    expect(onUploadImage).not.toHaveBeenCalled();
  });
});
