import { VisuallyHidden } from '@raulrod/ui';
import type { Editor } from '@tiptap/core';
import type { MouseEvent as ReactMouseEvent, ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import styled from 'styled-components';
import { Bounds, Grid, Position, Size } from '../../../domain/shared';
import type { Element, ElementType } from '../../../domain/element';
import { isTextElement } from '../../../domain/element';
import type { ElementId } from '../../../domain/shared';
import type {
  CanvasViewportStore,
  CommandHistory,
  RemoteCursor,
  SelectionStore,
} from '../../../application/services';
import type { UpdateElementInput } from '../../../application/commands';
import {
  bringElementsToFront,
  deleteElements,
  elementContentBounds,
  findSelectableAt,
  getVisibleElementIds,
  sendElementsToBack,
  toSelectableItems,
} from '../../../application/services';
import { describeBoard, describeElement } from '../accessibility';
import { useCanvasNavigation } from '../hooks/use-canvas-navigation';
import { useCanvasFocus } from '../hooks/use-canvas-focus';
import { useCursorBroadcast } from '../hooks/use-cursor-broadcast';
import { useDragSelection } from '../hooks/use-drag-selection';
import { useElementCopyPaste } from '../hooks/use-element-copy-paste';
import { useElementDelete } from '../hooks/use-element-delete';
import { useElementDuplicate } from '../hooks/use-element-duplicate';
import { useElementEdit } from '../hooks/use-element-edit';
import { useElementMove } from '../hooks/use-element-move';
import { useElementRedo } from '../hooks/use-element-redo';
import { useElementResize } from '../hooks/use-element-resize';
import { useElementSize } from '../hooks/use-element-size';
import { useElementUndo } from '../hooks/use-element-undo';
import { useElementZOrder } from '../hooks/use-element-z-order';
import { usePan } from '../hooks/use-pan';
import { useSelection } from '../hooks/use-selection';
import { useSelectionKeyboard } from '../hooks/use-selection-keyboard';
import { useSpacePressed } from '../hooks/use-space-pressed';
import { useZoom } from '../hooks/use-zoom';
import { ElementView } from '../renderers';
import type { ElementRendererRegistry } from '../renderers';
import { EmptyState } from '../../components/empty-state';
import { CanvasToolbar } from './canvas-toolbar';
import { ElementContextMenu } from './element-context-menu';
import type { TextFormatMenuSection } from './element-context-menu';
import { ElementEditorOverlay } from './element-editor-overlay';
import { RemoteCursorsOverlay } from './remote-cursors-overlay';
import { SelectionOverlay } from './selection-overlay';
import { ViewportControls } from './viewport-controls';
import { applyFormatToEditor, getEditorFormatState } from '../text-format/editor-format';
import { applyFormatToDocument, getTextFormatState } from '../text-format/text-format';
import type { TextFormatAction } from '../text-format/text-format';

const CanvasContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
  cursor: default;
  user-select: none;
  outline: none;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: -2px;
  }

  &[data-pan-key='true'] {
    cursor: grab;
  }

  &[data-panning='true'] {
    cursor: grabbing;
  }

  &[data-selecting='true'] {
    cursor: crosshair;
  }

  &[data-moving='true'] {
    cursor: grabbing;
  }

  &[data-resizing='true'] {
    cursor: nwse-resize;
  }
`;

const Marquee = styled.div`
  position: absolute;
  pointer-events: none;
  border: 1px solid ${({ theme }) => theme.canvas.selection};
  background-color: ${({ theme }) => theme.canvas.selectionFill};
`;

const World = styled.div`
  position: absolute;
  inset: 0;
  transform-origin: 0 0;
  will-change: transform;
`;

const GridLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, ${({ theme }) => theme.canvas.grid} 1px, transparent 1px),
    linear-gradient(to bottom, ${({ theme }) => theme.canvas.grid} 1px, transparent 1px);
  opacity: 0.5;
`;

const Hint = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
  max-width: 480px;
  color: ${({ theme }) => theme.canvas.hintText};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

const CANVAS_GRID = Grid.default();

/** World-space margin kept mounted around the viewport to avoid flicker (TASK-114). */
export const CULLING_MARGIN = 64;

const BOARD_SUMMARY_ID = 'canvas-board-summary';

const CANVAS_SHORTCUTS =
  'Arrow keys to move selection · Shift + Arrow to extend selection · Drag to select · Space + drag to pan · Ctrl/Cmd + scroll to zoom · Esc to clear · Ctrl/Cmd + A to select all · Delete to remove · Ctrl/Cmd + D to duplicate · Ctrl/Cmd + C to copy · Ctrl/Cmd + V to paste · Ctrl/Cmd + Z to undo · Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y to redo · Ctrl/Cmd + ] to bring to front · Ctrl/Cmd + [ to send to back · Right-click an object for more options';

const EDITABLE_ELEMENT_TYPES: ReadonlySet<ElementType> = new Set<ElementType>([
  'text',
  'note',
  'task',
  'frame',
  'link',
]);

export interface CanvasProps {
  readonly store: CanvasViewportStore;
  readonly selectionStore: SelectionStore;
  readonly elements?: readonly Element[];
  readonly renderers?: ElementRendererRegistry;
  readonly onMoveElements?: (elements: readonly Element[]) => void;
  readonly onResizeElements?: (elements: readonly Element[]) => void;
  readonly onTransformEnd?: () => void;
  readonly onDeleteElements?: (elements: readonly Element[]) => void;
  readonly onDuplicateElements?: (
    elements: readonly Element[],
    duplicatedIds: readonly string[],
  ) => void;
  readonly onPasteElements?: (elements: readonly Element[], pastedIds: readonly string[]) => void;
  readonly onReorderElements?: (elements: readonly Element[]) => void;
  readonly generateId?: () => ElementId;
  readonly history?: CommandHistory<readonly Element[]>;
  readonly onUndoElements?: (elements: readonly Element[]) => void;
  readonly onRedoElements?: (elements: readonly Element[]) => void;
  readonly onCreateElement?: (type: ElementType) => ElementId | void;
  readonly onUpdateElement?: (input: UpdateElementInput) => void;
  readonly remoteCursors?: readonly RemoteCursor[];
  readonly onCursorMove?: (position: Position) => void;
  readonly readOnly?: boolean;
}

export function Canvas({
  store,
  selectionStore,
  elements = [],
  renderers,
  onMoveElements,
  onResizeElements,
  onTransformEnd,
  onDeleteElements,
  onDuplicateElements,
  onPasteElements,
  onReorderElements,
  generateId,
  history,
  onUndoElements,
  onRedoElements,
  onCreateElement,
  onUpdateElement,
  remoteCursors = [],
  onCursorMove,
  readOnly = false,
}: CanvasProps): ReactElement {
  const viewport = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const selection = useSyncExternalStore(selectionStore.subscribe, selectionStore.getSnapshot);
  const spacePressed = useSpacePressed();
  const { isPanning, ref: panRef } = usePan({ onPan: store.pan, spacePressed });
  const { ref: zoomRef } = useZoom({ onZoom: store.zoom });
  const { ref: canvasFocusRef } = useCanvasFocus();
  const { size: measuredSize, ref: elementSizeRef } = useElementSize();

  useEffect(() => {
    if (measuredSize === null || measuredSize.width <= 0 || measuredSize.height <= 0) {
      return;
    }

    store.resize(Size.create(measuredSize.width, measuredSize.height));
  }, [store, measuredSize]);

  const handleCursorMove = useCallback(
    (position: Position) => {
      onCursorMove?.(position);
    },
    [onCursorMove],
  );
  const { ref: cursorBroadcastRef } = useCursorBroadcast({
    onCursorMove: handleCursorMove,
    viewport,
    disabled: onCursorMove === undefined,
  });

  const items = useMemo(() => toSelectableItems(elements), [elements]);
  const boardSummary = useMemo(() => describeBoard(elements), [elements]);

  const handleSelect = useCallback(
    (id: string, additive: boolean) => {
      if (additive) {
        selectionStore.toggle(id);
        return;
      }

      if (selection.selectedIds.includes(id)) {
        return;
      }

      selectionStore.select(id);
    },
    [selectionStore, selection.selectedIds],
  );

  const handleSelectOnly = useCallback(
    (id: string) => {
      selectionStore.select(id);
    },
    [selectionStore],
  );

  const handleSelectMany = useCallback(
    (ids: readonly string[], additive: boolean) => {
      if (additive) {
        selectionStore.addMany(ids);
        return;
      }

      selectionStore.selectMany(ids);
    },
    [selectionStore],
  );

  const handleSelectAll = useCallback(
    (ids: readonly string[]) => {
      selectionStore.selectMany(ids);
    },
    [selectionStore],
  );

  const handleClear = useCallback(() => {
    selectionStore.clear();
  }, [selectionStore]);

  const handleNavigate = useCallback(
    (id: string, additive: boolean) => {
      if (additive) {
        selectionStore.addMany([id]);
        return;
      }

      selectionStore.select(id);
    },
    [selectionStore],
  );

  const { ref: selectionRef } = useSelection({
    items,
    viewport,
    onSelect: handleSelect,
  });

  const { isMoving, ref: elementMoveRef } = useElementMove({
    elements,
    viewport,
    selectedIds: selection.selectedIds,
    onMoveElements,
    onSelectOnly: handleSelectOnly,
    onTransformEnd,
    spacePressed,
    disabled: readOnly,
  });

  const { isResizing, ref: elementResizeRef } = useElementResize({
    elements,
    viewport,
    selectedIds: selection.selectedIds,
    onResizeElements,
    onTransformEnd,
    spacePressed,
    disabled: readOnly,
  });

  const { ref: dragSelectionRef, rect: marqueeRect } = useDragSelection({
    items,
    viewport,
    onSelect: handleSelectMany,
    onClear: handleClear,
    spacePressed,
  });

  const allIds = useMemo(() => items.map((item) => item.id), [items]);

  const { ref: selectionKeyboardRef } = useSelectionKeyboard({
    allIds,
    onClear: handleClear,
    onSelectAll: handleSelectAll,
  });

  const { activeId, ref: canvasNavigationRef } = useCanvasNavigation({
    items,
    selectedIds: selection.selectedIds,
    onNavigate: handleNavigate,
    disabled: readOnly,
  });

  const { ref: elementDeleteRef } = useElementDelete({
    elements,
    selectedIds: selection.selectedIds,
    onDeleteElements,
    onSelectionCleared: handleClear,
    disabled: readOnly,
  });

  const handleDuplicateElements = useMemo(() => {
    if (onDuplicateElements === undefined) {
      return undefined;
    }

    return (nextElements: readonly Element[], duplicatedIds: readonly string[]): void => {
      onDuplicateElements(nextElements, duplicatedIds);
      selectionStore.selectMany(duplicatedIds);
    };
  }, [onDuplicateElements, selectionStore]);

  const { ref: elementDuplicateRef } = useElementDuplicate({
    elements,
    selectedIds: selection.selectedIds,
    generateId,
    onDuplicateElements: handleDuplicateElements,
    disabled: readOnly,
  });

  const handlePasteElements = useMemo(() => {
    if (onPasteElements === undefined) {
      return undefined;
    }

    return (nextElements: readonly Element[], pastedIds: readonly string[]): void => {
      onPasteElements(nextElements, pastedIds);
      selectionStore.selectMany(pastedIds);
    };
  }, [onPasteElements, selectionStore]);

  const { ref: elementCopyPasteRef } = useElementCopyPaste({
    elements,
    selectedIds: selection.selectedIds,
    generateId,
    onPasteElements: handlePasteElements,
    disabled: readOnly,
  });

  const { ref: elementZOrderRef } = useElementZOrder({
    elements,
    selectedIds: selection.selectedIds,
    onReorderElements,
    disabled: readOnly,
  });

  const { ref: elementUndoRef } = useElementUndo({ history, onUndoElements, disabled: readOnly });
  const { ref: elementRedoRef } = useElementRedo({ history, onRedoElements, disabled: readOnly });

  const [editingElementId, setEditingElementId] = useState<string | null>(null);

  const editingElement = useMemo(
    () =>
      editingElementId === null
        ? null
        : (elements.find((element) => element.id.value === editingElementId) ?? null),
    [elements, editingElementId],
  );

  useEffect(() => {
    if (editingElementId !== null && editingElement === null) {
      setEditingElementId(null);
    }
  }, [editingElementId, editingElement]);

  const beginEditing = useCallback(
    (id: string): void => {
      if (readOnly || onUpdateElement === undefined) {
        return;
      }

      const target = elements.find((element) => element.id.value === id);

      if (target === undefined || !EDITABLE_ELEMENT_TYPES.has(target.type)) {
        return;
      }

      setEditingElementId(id);
    },
    [elements, onUpdateElement, readOnly],
  );

  const { ref: elementEditRef } = useElementEdit({
    selectedIds: selection.selectedIds,
    onBeginEdit: beginEditing,
    disabled: readOnly || onUpdateElement === undefined,
  });

  const handleCommitEdit = useCallback(
    (input: UpdateElementInput): void => {
      onUpdateElement?.(input);
      setEditingElementId(null);
    },
    [onUpdateElement],
  );

  const handleCancelEdit = useCallback((): void => {
    setEditingElementId(null);
  }, []);

  const textEditorRef = useRef<Editor | null>(null);
  const formatMenuOpenRef = useRef(false);
  const [contextMenuTargetId, setContextMenuTargetId] = useState<string | null>(null);

  const handleTextEditorReady = useCallback((editor: Editor | null): void => {
    textEditorRef.current = editor;
  }, []);

  const formatTarget = useMemo(() => {
    if (readOnly) {
      return null;
    }

    const targetId =
      contextMenuTargetId ?? (selection.selectedIds.length === 1 ? selection.selectedIds[0] : null);

    if (targetId === null) {
      return null;
    }

    const target = elements.find((element) => element.id.value === targetId);

    return target !== undefined && isTextElement(target) ? target : null;
  }, [readOnly, contextMenuTargetId, selection.selectedIds, elements]);

  const handleFormatAction = useCallback(
    (action: TextFormatAction): void => {
      if (formatTarget === null || onUpdateElement === undefined) {
        return;
      }

      const editor = textEditorRef.current;

      if (
        editingElement !== null &&
        editingElement.id.value === formatTarget.id.value &&
        editor !== null &&
        !editor.isDestroyed
      ) {
        applyFormatToEditor(editor, action);
        return;
      }

      const next = applyFormatToDocument(
        formatTarget.content,
        action,
        getTextFormatState(formatTarget.content),
      );

      onUpdateElement({ type: 'text', element: formatTarget, content: next });
    },
    [formatTarget, editingElement, onUpdateElement],
  );

  const formatSection = useMemo<TextFormatMenuSection | null>(() => {
    if (formatTarget === null) {
      return null;
    }

    const editor = textEditorRef.current;
    const isEditingTarget =
      editingElement !== null &&
      editingElement.id.value === formatTarget.id.value &&
      editor !== null &&
      !editor.isDestroyed;

    return {
      state: isEditingTarget
        ? getEditorFormatState(editor)
        : getTextFormatState(formatTarget.content),
      onAction: handleFormatAction,
    };
  }, [formatTarget, editingElement, handleFormatAction]);

  const handleUndo = useCallback((): void => {
    if (history === undefined || !history.canUndo()) {
      return;
    }

    const result = history.undo();

    if (result.status === 'error') {
      return;
    }

    onUndoElements?.(result.state);
  }, [history, onUndoElements]);

  const handleRedo = useCallback((): void => {
    if (history === undefined || !history.canRedo()) {
      return;
    }

    const result = history.redo();

    if (result.status === 'error') {
      return;
    }

    onRedoElements?.(result.state);
  }, [history, onRedoElements]);

  const handleToolbarDelete = useCallback((): void => {
    if (selection.selectedIds.length === 0) {
      return;
    }

    const result = deleteElements(elements, selection.selectedIds);

    if (result.status === 'error') {
      return;
    }

    onDeleteElements?.(result.elements);
    handleClear();
  }, [elements, selection.selectedIds, onDeleteElements, handleClear]);

  const handleFitView = useCallback((): void => {
    store.fit(elementContentBounds(elements));
  }, [store, elements]);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const closeContextMenu = useCallback((): void => {
    formatMenuOpenRef.current = false;
    setContextMenu(null);
    setContextMenuTargetId(null);
  }, []);

  const handleContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>): void => {
      if (readOnly) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const offset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const world = viewport.screenToWorld(Position.create(offset.x, offset.y));
      const hitId = findSelectableAt(items, world);

      event.preventDefault();

      if (hitId === null) {
        formatMenuOpenRef.current = false;
        setContextMenu(null);
        setContextMenuTargetId(null);
        return;
      }

      if (!selection.selectedIds.includes(hitId)) {
        selectionStore.select(hitId);
      }

      formatMenuOpenRef.current = true;
      setContextMenu(offset);
      setContextMenuTargetId(hitId);
    },
    [readOnly, viewport, items, selection.selectedIds, selectionStore],
  );

  const handleBringToFront = useCallback((): void => {
    closeContextMenu();

    if (selection.selectedIds.length === 0) {
      return;
    }

    const result = bringElementsToFront(elements, selection.selectedIds);

    if (result.status === 'error') {
      return;
    }

    onReorderElements?.(result.elements);
  }, [closeContextMenu, elements, selection.selectedIds, onReorderElements]);

  const handleSendToBack = useCallback((): void => {
    closeContextMenu();

    if (selection.selectedIds.length === 0) {
      return;
    }

    const result = sendElementsToBack(elements, selection.selectedIds);

    if (result.status === 'error') {
      return;
    }

    onReorderElements?.(result.elements);
  }, [closeContextMenu, elements, selection.selectedIds, onReorderElements]);

  const handleCreateElement = useCallback(
    (type: ElementType): void => {
      const created = onCreateElement?.(type);

      if (created === undefined) {
        return;
      }

      setEditingElementId(created.value);
    },
    [onCreateElement],
  );

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      panRef.current = node;
      zoomRef.current = node;
      selectionRef.current = node;
      dragSelectionRef.current = node;
      selectionKeyboardRef.current = node;
      canvasNavigationRef.current = node;
      elementMoveRef.current = node;
      elementResizeRef.current = node;
      elementDeleteRef.current = node;
      elementDuplicateRef.current = node;
      elementCopyPasteRef.current = node;
      elementZOrderRef.current = node;
      elementUndoRef.current = node;
      elementRedoRef.current = node;
      elementEditRef.current = node;
      cursorBroadcastRef.current = node;
      canvasFocusRef.current = node;
      elementSizeRef(node);
    },
    [
      panRef,
      zoomRef,
      selectionRef,
      dragSelectionRef,
      selectionKeyboardRef,
      canvasNavigationRef,
      elementMoveRef,
      elementResizeRef,
      elementDeleteRef,
      elementDuplicateRef,
      elementCopyPasteRef,
      elementZOrderRef,
      elementUndoRef,
      elementRedoRef,
      elementEditRef,
      cursorBroadcastRef,
      canvasFocusRef,
      elementSizeRef,
    ],
  );

  const transform = viewport.transform;
  const translateX = -transform.x * transform.scale;
  const translateY = -transform.y * transform.scale;

  const gridStep = CANVAS_GRID.scaledSpacing(transform.scale);
  const gridOffset = CANVAS_GRID.offsetFor(transform);

  const selectedIdSet = useMemo(() => new Set(selection.selectedIds), [selection.selectedIds]);
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIdSet.has(item.id)),
    [items, selectedIdSet],
  );

  const ariaLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const element of elements) {
      labels.set(element.id.value, describeElement(element, elements));
    }
    return labels;
  }, [elements]);

  const visibleIds = useMemo<ReadonlySet<string> | null>(() => {
    const measured =
      measuredSize !== null && measuredSize.width > 0 && measuredSize.height > 0
        ? measuredSize
        : viewport.size;
    const size = { width: measured.width, height: measured.height };

    if (size.width <= 0 || size.height <= 0) {
      return null;
    }

    const topLeft = viewport.screenToWorld(Position.create(0, 0));
    const bottomRight = viewport.screenToWorld(Position.create(size.width, size.height));
    const width = bottomRight.x - topLeft.x;
    const height = bottomRight.y - topLeft.y;

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }

    const visibleWorld = Bounds.fromXYWH(topLeft.x, topLeft.y, width, height);
    return new Set(getVisibleElementIds(items, visibleWorld, CULLING_MARGIN));
  }, [measuredSize, viewport, items]);

  const canCreateElement = !readOnly && onCreateElement !== undefined;
  const canUndo =
    !readOnly && history !== undefined && onUndoElements !== undefined && history.canUndo();
  const canRedo =
    !readOnly && history !== undefined && onRedoElements !== undefined && history.canRedo();
  const hasSelection = !readOnly && selection.selectedIds.length > 0;
  const canCreateConnector = canCreateElement && selection.selectedIds.length === 2;

  return (
    <CanvasContainer
      ref={setContainerRef}
      role="application"
      aria-label="Canvas"
      aria-describedby={BOARD_SUMMARY_ID}
      aria-readonly={readOnly}
      aria-activedescendant={activeId === null ? undefined : `element-${activeId}`}
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Escape Control+A Meta+A Delete Control+D Meta+D Control+C Meta+C Control+V Meta+V Control+Z Meta+Z Control+Shift+Z Meta+Shift+Z Control+Y Meta+Y Control+] Meta+] Control+[ Meta+["
      aria-grabbed={isPanning}
      tabIndex={0}
      onContextMenu={handleContextMenu}
      data-active-id={activeId ?? undefined}
      data-panning={isPanning}
      data-pan-key={spacePressed}
      data-selecting={marqueeRect !== null}
      data-moving={isMoving}
      data-resizing={isResizing}
      data-scale={transform.scale}
    >
      <VisuallyHidden id={BOARD_SUMMARY_ID} data-testid="canvas-board-summary">
        {boardSummary}
      </VisuallyHidden>
      <GridLayer
        data-testid="canvas-grid"
        style={{
          backgroundSize: `${gridStep}px ${gridStep}px`,
          backgroundPosition: `${gridOffset.x}px ${gridOffset.y}px`,
        }}
      />
      <World
        data-testid="canvas-world"
        style={{
          transform: `translate(${translateX}px, ${translateY}px) scale(${transform.scale})`,
        }}
      >
        {elements.map((element) => {
          if (visibleIds !== null && !visibleIds.has(element.id.value)) {
            return null;
          }

          return (
            <ElementView
              key={element.id.value}
              element={element}
              selected={selectedIdSet.has(element.id.value)}
              renderers={renderers}
              ariaLabel={ariaLabels.get(element.id.value)}
            />
          );
        })}
        {editingElementId === null ? <SelectionOverlay items={selectedItems} /> : null}
        {editingElement === null ? null : (
          <ElementEditorOverlay
            key={editingElement.id.value}
            element={editingElement}
            onCommit={handleCommitEdit}
            onCancel={handleCancelEdit}
            onTextEditorReady={handleTextEditorReady}
            textCommitGuardRef={formatMenuOpenRef}
          />
        )}
        {elements.length === 0 ? (
          <Hint>
            <EmptyState title="This board is empty" titleAs="h2" description={CANVAS_SHORTCUTS} />
          </Hint>
        ) : null}
      </World>
      <RemoteCursorsOverlay cursors={remoteCursors} viewport={viewport} />
      <ElementContextMenu
        position={contextMenu}
        onBringToFront={handleBringToFront}
        onSendToBack={handleSendToBack}
        onClose={closeContextMenu}
        format={formatSection}
      />
      <CanvasToolbar
        onCreateElement={handleCreateElement}
        onDeleteSelection={handleToolbarDelete}
        onFitView={handleFitView}
        canCreate={canCreateElement}
        hasSelection={hasSelection}
        canCreateConnector={canCreateConnector}
      />
      {marqueeRect !== null ? (
        <Marquee
          data-testid="drag-selection-rect"
          aria-hidden="true"
          style={{
            left: marqueeRect.x,
            top: marqueeRect.y,
            width: marqueeRect.width,
            height: marqueeRect.height,
          }}
        />
      ) : null}
      <ViewportControls
        store={store}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />
    </CanvasContainer>
  );
}
