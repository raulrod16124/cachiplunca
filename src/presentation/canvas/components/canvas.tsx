import { VisuallyHidden } from '@raulrod/ui';
import type { Editor } from '@tiptap/core';
import type { MouseEvent as ReactMouseEvent, ReactElement, Ref } from 'react';
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import styled from 'styled-components';
import { Bounds, Grid, Position, Size, UserId } from '../../../domain/shared';
import type { Element, ElementType } from '../../../domain/element';
import {
  isConnectorElement,
  isFrameElement,
  isNoteElement,
  isTaskElement,
  richTextToPlain,
} from '../../../domain/element';
import type { ElementId } from '../../../domain/shared';
import type {
  AlignmentMode,
  CanvasViewportStore,
  CommandHistory,
  ConnectorGeometry,
  DistributionAxis,
  RemoteCursor,
  SelectionStore,
} from '../../../application/services';
import type { UpdateElementInput } from '../../../application/commands';
import { createResizeElement } from '../../../application/commands';
import {
  alignElements,
  bringElementsToFront,
  connectorCandidateIds,
  deleteElements,
  distributeElements,
  findSelectableAt,
  getVisibleElementIds,
  IMAGE_ALLOWED_CONTENT_TYPES,
  parseTaskDueDateInput,
  resolveConnectorGeometry,
  sendElementsToBack,
  taskDraftFromElement,
  taskDueDateInputValue,
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
import {
  useConnectorEndpointDrag,
  type ConnectorEndpointDragInput,
} from '../hooks/use-connector-endpoint-drag';
import { useSelection } from '../hooks/use-selection';
import { useSelectionKeyboard } from '../hooks/use-selection-keyboard';
import { useSpacePressed } from '../hooks/use-space-pressed';
import { useZoom } from '../hooks/use-zoom';
import { ElementView } from '../renderers';
import type { ElementRendererRegistry } from '../renderers';
import { DecorativeSpark, PaperTexture } from '../../components/decorative';
import { EmptyState } from '../../components/empty-state';
import { useI18n } from '../../i18n';
import { CanvasActionsToolbar } from './canvas-actions-toolbar';
import { ElementContextMenu } from './element-context-menu';
import { ElementEditorOverlay } from './element-editor-overlay';
import { RemoteCursorsOverlay } from './remote-cursors-overlay';
import { SelectionOverlay } from './selection-overlay';
import { TaskFormDialog, type TaskAssigneeOption, type TaskFormValues } from './task-form-dialog';
import { ViewportControls } from './viewport-controls';
import {
  getEditableRichTextTarget,
  toUpdateElementInput,
} from '../text-format/editable-text-element';
import { FloatingTextToolbar } from '../text-format/floating-text-toolbar';
import { documentFormatTarget, editorFormatTarget } from '../text-format/text-format-target';
import type { TextFormatTarget } from '../text-format/text-format-target';
import { readTextSelectionElementId } from '../text-format/use-text-selection';

const CanvasContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
  cursor: grab;
  user-select: none;
  outline: none;
  background: ${({ theme }) => theme.canvas.surface};

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

const CanvasTexture = styled(PaperTexture)`
  opacity: 0.12;
`;

const GridLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(
      to right,
      ${({ theme }) => `color-mix(in srgb, ${theme.canvas.grid} 60%, transparent)`} 1px,
      transparent 1px
    ),
    linear-gradient(
      to bottom,
      ${({ theme }) => `color-mix(in srgb, ${theme.canvas.grid} 60%, transparent)`} 1px,
      transparent 1px
    );
  opacity: 0.4;
`;

const Hint = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: auto;
  max-width: 480px;
  color: ${({ theme }) => theme.canvas.hintText};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

const CANVAS_GRID = Grid.default();

const resizeElement = createResizeElement();

/** World-space margin kept mounted around the viewport to avoid flicker. */
export const CULLING_MARGIN = 64;

const BOARD_SUMMARY_ID = 'canvas-board-summary';

const CANVAS_SHORTCUTS =
  'Arrow keys to move selection · Shift + Arrow to extend selection · Drag on empty canvas to pan · Shift + drag to select · Space + drag or middle-drag to pan · Ctrl/Cmd + scroll to zoom · Esc to clear · Ctrl/Cmd + A to select all · Delete to remove · Ctrl/Cmd + D to duplicate · Ctrl/Cmd + C to copy · Ctrl/Cmd + V to paste · Ctrl/Cmd + Z to undo · Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y to redo · Ctrl/Cmd + ] to bring to front · Ctrl/Cmd + [ to send to back · Right-click an object for more options';

const EDITABLE_ELEMENT_TYPES: ReadonlySet<ElementType> = new Set<ElementType>([
  'text',
  'note',
  'frame',
  'link',
  'image',
]);

type TaskFormState =
  { readonly mode: 'create' } | { readonly mode: 'edit'; readonly elementId: string };

export interface CanvasProps {
  readonly store: CanvasViewportStore;
  readonly selectionStore: SelectionStore;
  readonly elements?: readonly Element[];
  readonly renderers?: ElementRendererRegistry;
  readonly onMoveElements?: (elements: readonly Element[]) => void;
  readonly onResizeElements?: (elements: readonly Element[]) => void;
  readonly onAlignElements?: (elements: readonly Element[]) => void;
  readonly onDistributeElements?: (elements: readonly Element[]) => void;
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
  readonly onUploadImage?: (file: File) => Promise<ElementId | void> | ElementId | void;
  readonly onCreateConnector?: (mode: 'free' | 'bound') => ElementId | void;
  readonly onCreateTask?: (values: TaskFormValues) => ElementId | void;
  readonly onCreateTaskFromElement?: (element: Element) => ElementId | void;
  readonly assignees?: readonly TaskAssigneeOption[];
  readonly onUpdateConnectorEndpoint?: (input: ConnectorEndpointDragInput) => void;
  readonly onUpdateElement?: (input: UpdateElementInput) => void;
  readonly remoteCursors?: readonly RemoteCursor[];
  readonly userColors?: ReadonlyMap<string, string>;
  readonly unresolvedCommentCounts?: ReadonlyMap<string, number>;
  readonly onOpenComments?: (elementId: string) => void;
  readonly onCursorMove?: (position: Position) => void;
  readonly readOnly?: boolean;
  readonly presentation?: boolean;
}

export interface CanvasCommandHandle {
  readonly createElement: (type: ElementType) => void;
  readonly createConnector: (mode: 'free' | 'bound') => void;
  readonly fitView: () => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly focusElement: (elementId: string) => void;
}

export function Canvas({
  store,
  selectionStore,
  elements = [],
  renderers,
  onMoveElements,
  onResizeElements,
  onAlignElements,
  onDistributeElements,
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
  onUploadImage,
  onCreateConnector,
  onCreateTask,
  onCreateTaskFromElement,
  assignees = [],
  onUpdateElement,
  onUpdateConnectorEndpoint,
  remoteCursors = [],
  userColors,
  unresolvedCommentCounts,
  onOpenComments,
  onCursorMove,
  readOnly = false,
  presentation = false,
  commandRef,
}: CanvasProps & { readonly commandRef?: Ref<CanvasCommandHandle> }): ReactElement {
  const { t } = useI18n();
  const viewport = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const selection = useSyncExternalStore(selectionStore.subscribe, selectionStore.getSnapshot);
  const spacePressed = useSpacePressed();
  const handleClear = useCallback(() => {
    selectionStore.clear();
  }, [selectionStore]);
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
  const handleOpenComments = useCallback(
    (elementId: string) => {
      if (onOpenComments === undefined) {
        return;
      }

      selectionStore.select(elementId);
      onOpenComments(elementId);
    },
    [onOpenComments, selectionStore],
  );
  const commentLabel = useCallback(
    (count: number): string =>
      count === 1 ? t('comments.indicator.one') : t('comments.indicator.other', { count }),
    [t],
  );
  const { ref: cursorBroadcastRef } = useCursorBroadcast({
    onCursorMove: handleCursorMove,
    viewport,
    disabled: onCursorMove === undefined,
  });

  const elementsById = useMemo(
    () => new Map(elements.map((element) => [element.id.value, element])),
    [elements],
  );
  const assigneeLabels = useMemo(
    () => new Map(assignees.map((assignee) => [assignee.userId, assignee.label])),
    [assignees],
  );
  const connectorGeometries = useMemo(() => {
    const geometries = new Map<string, ConnectorGeometry>();

    for (const element of elements) {
      if (!isConnectorElement(element)) {
        continue;
      }

      const geometry = resolveConnectorGeometry(element, elementsById);

      if (geometry !== null) {
        geometries.set(element.id.value, geometry);
      }
    }

    return geometries;
  }, [elements, elementsById]);
  const items = useMemo(
    () =>
      toSelectableItems(
        elements.filter(
          (element) => !isConnectorElement(element) || connectorGeometries.has(element.id.value),
        ),
        connectorGeometries,
      ),
    [elements, connectorGeometries],
  );
  const renderElements = useMemo<readonly Element[]>(() => {
    const connectors = elements.filter((element) => isConnectorElement(element));
    const others = elements.filter((element) => !isConnectorElement(element));

    return [...connectors, ...others];
  }, [elements]);
  const boardSummary = useMemo(() => describeBoard(elements), [elements]);
  const { isPanning, ref: panRef } = usePan({
    onPan: store.pan,
    onEmptyClick: handleClear,
    items,
    viewport,
    spacePressed,
  });

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

  const handleUpdateConnectorEndpoint = useCallback(
    (input: ConnectorEndpointDragInput): void => {
      onUpdateConnectorEndpoint?.(input);
    },
    [onUpdateConnectorEndpoint],
  );

  const { ref: connectorEndpointRef } = useConnectorEndpointDrag({
    elements,
    viewport,
    selectedIds: selection.selectedIds,
    onUpdateConnectorEndpoint: handleUpdateConnectorEndpoint,
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
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const editingElement = useMemo(
    () =>
      editingElementId === null
        ? null
        : (elements.find((element) => element.id.value === editingElementId) ?? null),
    [elements, editingElementId],
  );

  const editingTaskElement = useMemo(() => {
    if (taskForm?.mode !== 'edit') {
      return null;
    }

    const element = elements.find((candidate) => candidate.id.value === taskForm.elementId);

    return element !== undefined && isTaskElement(element) ? element : null;
  }, [elements, taskForm]);

  const taskFormInitialValues = useMemo<TaskFormValues | undefined>(() => {
    if (taskForm === null || taskForm.mode !== 'edit' || editingTaskElement === null) {
      return undefined;
    }

    return {
      title: richTextToPlain(editingTaskElement.title),
      status: editingTaskElement.status,
      notes:
        editingTaskElement.notes === undefined ? '' : richTextToPlain(editingTaskElement.notes),
      assigneeId: editingTaskElement.assigneeId?.value ?? '',
      dueDate: taskDueDateInputValue(editingTaskElement.dueDate),
    };
  }, [taskForm, editingTaskElement]);

  useEffect(() => {
    if (editingElementId !== null && editingElement === null) {
      setEditingElementId(null);
    }
  }, [editingElementId, editingElement]);

  useEffect(() => {
    if (taskForm?.mode === 'edit' && editingTaskElement === null) {
      setTaskForm(null);
    }
  }, [taskForm, editingTaskElement]);

  const beginEditing = useCallback(
    (id: string): void => {
      if (readOnly || onUpdateElement === undefined) {
        return;
      }

      const target = elements.find((element) => element.id.value === id);

      if (target === undefined) {
        return;
      }

      if (target.type === 'task') {
        setTaskForm({ mode: 'edit', elementId: id });
        return;
      }

      if (!EDITABLE_ELEMENT_TYPES.has(target.type)) {
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

  const [activeTextEditor, setActiveTextEditor] = useState<Editor | null>(null);
  const floatingToolbarOpenRef = useRef(false);
  const [contextMenuTargetId, setContextMenuTargetId] = useState<string | null>(null);
  const [textSelectionTargetId, setTextSelectionTargetId] = useState<string | null>(null);
  const elementsRef = useRef(elements);
  elementsRef.current = elements;

  useEffect(() => {
    const handleSelectionChange = (): void => {
      setTextSelectionTargetId(readTextSelectionElementId(containerRef.current));
    };

    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const handleTextEditorReady = useCallback((editor: Editor | null): void => {
    setActiveTextEditor(editor);
  }, []);

  const editableTarget = useMemo(() => {
    if (editingElement !== null) {
      return getEditableRichTextTarget(editingElement);
    }

    const targetId =
      textSelectionTargetId ??
      contextMenuTargetId ??
      (selection.selectedIds.length === 1 ? selection.selectedIds[0] : null);

    if (targetId === null) {
      return null;
    }

    const target = elements.find((element) => element.id.value === targetId);

    return getEditableRichTextTarget(target);
  }, [editingElement, textSelectionTargetId, contextMenuTargetId, selection.selectedIds, elements]);

  const formatTarget = useMemo<TextFormatTarget | null>(() => {
    if (readOnly || onUpdateElement === undefined || editableTarget === null) {
      return null;
    }

    if (editingElement !== null && activeTextEditor !== null && !activeTextEditor.isDestroyed) {
      return editorFormatTarget(activeTextEditor, { singleLine: editableTarget.singleLine });
    }

    // If we're actively editing an element but don't have a live editor instance
    // (e.g. non-text types before the fix, or during lazy loading), don't commit
    // via documentFormatTarget — the editor holds an unsynced draft and a mid-edit
    // commit would be overwritten by the editor's own blur-commit. Return null so
    // the floating toolbar is disabled while editing without a ready editor.
    if (editingElement !== null) {
      return null;
    }

    const targetId = editableTarget.element.id.value;

    return documentFormatTarget({
      singleLine: editableTarget.singleLine,
      getDocument: () => {
        const current = elementsRef.current.find((element) => element.id.value === targetId);
        return getEditableRichTextTarget(current)?.document;
      },
      commitDocument: (document) => {
        const current = elementsRef.current.find((element) => element.id.value === targetId);
        const currentTarget = getEditableRichTextTarget(current);

        if (currentTarget !== null) {
          onUpdateElement(toUpdateElementInput(currentTarget, document));
        }
      },
    });
  }, [readOnly, onUpdateElement, editableTarget, activeTextEditor]);

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

  const arrangeableSelectedIds = useMemo(() => {
    const selected = new Set(selection.selectedIds);

    return elements
      .filter((element) => selected.has(element.id.value) && !isConnectorElement(element))
      .map((element) => element.id.value);
  }, [elements, selection.selectedIds]);

  const handleAlignSelection = useCallback(
    (mode: AlignmentMode): void => {
      if (readOnly || onAlignElements === undefined) {
        return;
      }

      const result = alignElements(elements, arrangeableSelectedIds, mode);

      if (result.status === 'ok') {
        onAlignElements(result.elements);
      }
    },
    [readOnly, onAlignElements, elements, arrangeableSelectedIds],
  );

  const handleDistributeSelection = useCallback(
    (axis: DistributionAxis): void => {
      if (readOnly || onDistributeElements === undefined) {
        return;
      }

      const result = distributeElements(elements, arrangeableSelectedIds, axis);

      if (result.status === 'ok') {
        onDistributeElements(result.elements);
      }
    },
    [readOnly, onDistributeElements, elements, arrangeableSelectedIds],
  );

  const handleFitView = useCallback((): void => {
    const bounds = items.reduce<Bounds | null>(
      (accumulator, item) => (accumulator === null ? item.bounds : accumulator.union(item.bounds)),
      null,
    );

    store.fit(bounds);
  }, [store, items]);

  const handleFocusElement = useCallback(
    (elementId: string): void => {
      const item = items.find((candidate) => candidate.id === elementId);

      if (item === undefined) {
        return;
      }

      selectionStore.select(elementId);
      store.center(item.bounds);
    },
    [items, selectionStore, store],
  );

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const closeContextMenu = useCallback((): void => {
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
        setContextMenu(null);
        setContextMenuTargetId(null);
        return;
      }

      if (!selection.selectedIds.includes(hitId)) {
        selectionStore.select(hitId);
      }

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

  const contextMenuTarget = useMemo(() => {
    if (contextMenuTargetId === null) {
      return null;
    }

    return elements.find((element) => element.id.value === contextMenuTargetId) ?? null;
  }, [contextMenuTargetId, elements]);

  const noteColorMenu = useMemo(() => {
    if (
      readOnly ||
      onUpdateElement === undefined ||
      contextMenuTarget === null ||
      !isNoteElement(contextMenuTarget)
    ) {
      return undefined;
    }

    return {
      currentColor: contextMenuTarget.color,
      onSelect: (color: string): void => {
        closeContextMenu();
        onUpdateElement({ type: 'note', element: contextMenuTarget, color });
      },
      onClear: (): void => {
        closeContextMenu();
        onUpdateElement({ type: 'note', element: contextMenuTarget, color: null });
      },
    };
  }, [readOnly, onUpdateElement, contextMenuTarget, closeContextMenu]);

  const createTaskMenu = useMemo(() => {
    if (readOnly || onCreateTaskFromElement === undefined || contextMenuTarget === null) {
      return undefined;
    }

    if (!isNoteElement(contextMenuTarget) && !isFrameElement(contextMenuTarget)) {
      return undefined;
    }

    return {
      elementType: contextMenuTarget.type,
      disabled: taskDraftFromElement(contextMenuTarget) === null,
      onSelect: (): void => {
        closeContextMenu();
        onCreateTaskFromElement(contextMenuTarget);
      },
    };
  }, [readOnly, onCreateTaskFromElement, contextMenuTarget, closeContextMenu]);

  const handleCreateElement = useCallback(
    (type: ElementType): void => {
      if (type === 'task' && onCreateTask !== undefined) {
        setTaskForm({ mode: 'create' });
        return;
      }

      if (type === 'image') {
        if (onUploadImage !== undefined) {
          imageInputRef.current?.click();
        }
        return;
      }

      const created = onCreateElement?.(type);

      if (created === undefined) {
        return;
      }

      setEditingElementId(created.value);
    },
    [onCreateElement, onCreateTask, onUploadImage],
  );

  const handleCreateConnector = useCallback(
    (mode: 'free' | 'bound'): void => {
      onCreateConnector?.(mode);
    },
    [onCreateConnector],
  );

  useImperativeHandle(
    commandRef,
    () => ({
      createElement: handleCreateElement,
      createConnector: handleCreateConnector,
      fitView: handleFitView,
      undo: handleUndo,
      redo: handleRedo,
      focusElement: handleFocusElement,
    }),
    [
      handleCreateElement,
      handleCreateConnector,
      handleFitView,
      handleUndo,
      handleRedo,
      handleFocusElement,
    ],
  );

  const handleTaskFormSubmit = useCallback(
    (values: TaskFormValues): void => {
      if (taskForm === null) {
        return;
      }

      if (taskForm.mode === 'create') {
        onCreateTask?.(values);
        setTaskForm(null);
        return;
      }

      const element = elements.find((candidate) => candidate.id.value === taskForm.elementId);

      setTaskForm(null);

      if (element === undefined || !isTaskElement(element) || onUpdateElement === undefined) {
        return;
      }

      const currentTitle = richTextToPlain(element.title);
      const currentNotes = element.notes === undefined ? '' : richTextToPlain(element.notes);
      const currentAssigneeId = element.assigneeId?.value ?? '';
      const currentDueDate = taskDueDateInputValue(element.dueDate);
      const titleChanged = currentTitle !== values.title;
      const statusChanged = element.status !== values.status;
      const notesChanged = currentNotes !== values.notes;
      const assigneeChanged = currentAssigneeId !== values.assigneeId;
      const dueDateChanged = currentDueDate !== values.dueDate;

      if (!titleChanged && !statusChanged && !notesChanged && !assigneeChanged && !dueDateChanged) {
        return;
      }

      let dueDate: Date | null = null;

      if (dueDateChanged && values.dueDate !== '') {
        try {
          dueDate = parseTaskDueDateInput(values.dueDate) ?? null;
        } catch {
          return;
        }
      }

      onUpdateElement({
        type: 'task',
        element,
        ...(titleChanged ? { title: values.title } : {}),
        ...(statusChanged ? { status: values.status } : {}),
        ...(notesChanged ? { notes: values.notes === '' ? null : values.notes } : {}),
        ...(assigneeChanged
          ? { assigneeId: values.assigneeId === '' ? null : UserId.create(values.assigneeId) }
          : {}),
        ...(dueDateChanged ? { dueDate } : {}),
      });
    },
    [taskForm, elements, onCreateTask, onUpdateElement],
  );

  const handleResizeElement = useCallback(
    (target: Element, size: Size): void => {
      if (readOnly || onResizeElements === undefined) {
        return;
      }

      const current = elements.find((element) => element.id.value === target.id.value);

      if (current === undefined) {
        return;
      }

      if (current.size.width === size.width && current.size.height === size.height) {
        return;
      }

      const result = resizeElement({ element: current, size });

      if (result.status === 'error') {
        return;
      }

      onResizeElements(
        elements.map((element) =>
          element.id.value === current.id.value ? result.element : element,
        ),
      );
      onTransformEnd?.();
    },
    [elements, onResizeElements, onTransformEnd, readOnly],
  );

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      panRef.current = node;
      zoomRef.current = node;
      selectionRef.current = node;
      dragSelectionRef.current = node;
      selectionKeyboardRef.current = node;
      canvasNavigationRef.current = node;
      elementMoveRef.current = node;
      elementResizeRef.current = node;
      connectorEndpointRef.current = node;
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
      connectorEndpointRef,
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

  const canCreateElement =
    !readOnly &&
    (onCreateElement !== undefined ||
      onCreateTask !== undefined ||
      onCreateConnector !== undefined ||
      onUploadImage !== undefined);
  const canUndo =
    !readOnly && history !== undefined && onUndoElements !== undefined && history.canUndo();
  const canRedo =
    !readOnly && history !== undefined && onRedoElements !== undefined && history.canRedo();
  const hasSelection = !readOnly && selection.selectedIds.length > 0;
  const canAlign = !readOnly && onAlignElements !== undefined && arrangeableSelectedIds.length >= 2;
  const canDistribute =
    !readOnly && onDistributeElements !== undefined && arrangeableSelectedIds.length >= 3;
  const canCreateConnector =
    canCreateElement &&
    onCreateConnector !== undefined &&
    connectorCandidateIds(elements, selection.selectedIds) !== null;
  const canCreateImage = canCreateElement && onUploadImage !== undefined;

  return (
    <CanvasContainer
      ref={setContainerRef}
      role="application"
      aria-label={t('canvas.label')}
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
      <CanvasTexture />
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
        {renderElements.map((element) => {
          if (visibleIds !== null && !visibleIds.has(element.id.value)) {
            return null;
          }

          if (isConnectorElement(element) && !connectorGeometries.has(element.id.value)) {
            return null;
          }

          const geometry = connectorGeometries.get(element.id.value) ?? undefined;

          return (
            <ElementView
              key={element.id.value}
              element={element}
              selected={selectedIdSet.has(element.id.value)}
              renderers={renderers}
              ariaLabel={ariaLabels.get(element.id.value)}
              showTypeLabel={!presentation}
              connectorStart={geometry?.start}
              connectorEnd={geometry?.end}
              assigneeLabel={
                element.type === 'task' && element.assigneeId !== undefined
                  ? assigneeLabels.get(element.assigneeId.value)
                  : undefined
              }
              commentCount={unresolvedCommentCounts?.get(element.id.value) ?? 0}
              commentLabel={commentLabel(unresolvedCommentCounts?.get(element.id.value) ?? 0)}
              onOpenComments={onOpenComments === undefined ? undefined : handleOpenComments}
              onUpdateElement={readOnly ? undefined : onUpdateElement}
              onResizeElement={readOnly ? undefined : handleResizeElement}
            />
          );
        })}
        {editingElementId === null && !presentation ? (
          <SelectionOverlay items={selectedItems} />
        ) : null}
        {editingElement === null ? null : (
          <ElementEditorOverlay
            key={editingElement.id.value}
            element={editingElement}
            onCommit={handleCommitEdit}
            onCancel={handleCancelEdit}
            onTextEditorReady={handleTextEditorReady}
            textCommitGuardRef={floatingToolbarOpenRef}
          />
        )}
      </World>
      {elements.length === 0 ? (
        <Hint onPointerDown={(event) => event.stopPropagation()}>
          <EmptyState
            title={t('canvas.empty.title')}
            titleAs="h2"
            titleVariant="display"
            tone="brand"
            description={CANVAS_SHORTCUTS}
            illustration={<DecorativeSpark color="orange-500" size="lg" />}
            actionLabel={
              readOnly || onCreateElement === undefined ? undefined : t('canvas.empty.action')
            }
            onAction={
              readOnly || onCreateElement === undefined
                ? undefined
                : () => {
                    onCreateElement('note');
                  }
            }
          />
        </Hint>
      ) : null}
      {presentation ? null : (
        <RemoteCursorsOverlay cursors={remoteCursors} viewport={viewport} userColors={userColors} />
      )}
      <FloatingTextToolbar
        scopeRef={containerRef}
        formatTarget={formatTarget}
        enabled={!readOnly && !presentation}
        onOpenChange={(open) => {
          floatingToolbarOpenRef.current = open;
        }}
      />
      {presentation ? null : (
        <ElementContextMenu
          position={contextMenu}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          noteColor={noteColorMenu}
          createTask={createTaskMenu}
          onClose={closeContextMenu}
        />
      )}
      {presentation ? null : (
        <CanvasActionsToolbar
          onCreateElement={handleCreateElement}
          onCreateConnector={handleCreateConnector}
          onDeleteSelection={handleToolbarDelete}
          onFitView={handleFitView}
          onAlign={onAlignElements === undefined ? undefined : handleAlignSelection}
          onDistribute={onDistributeElements === undefined ? undefined : handleDistributeSelection}
          canCreate={canCreateElement}
          canCreateImage={canCreateImage}
          canCreateFreeConnector={canCreateElement && onCreateConnector !== undefined}
          hasSelection={hasSelection}
          canCreateConnector={canCreateConnector}
          canAlign={canAlign}
          canDistribute={canDistribute}
        />
      )}
      <input
        ref={imageInputRef}
        type="file"
        accept={IMAGE_ALLOWED_CONTENT_TYPES.join(',')}
        data-testid="image-file-input"
        aria-label={t('canvas.toolbar.addImage')}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';

          if (file !== undefined) {
            void onUploadImage?.(file);
          }
        }}
      />
      <TaskFormDialog
        open={taskForm !== null}
        mode={taskForm?.mode ?? 'create'}
        initialValues={taskFormInitialValues}
        assignees={assignees}
        onOpenChange={(open) => {
          if (!open) {
            setTaskForm(null);
          }
        }}
        onSubmit={handleTaskFormSubmit}
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
