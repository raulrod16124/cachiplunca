import type { ReactElement } from 'react';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import styled from 'styled-components';
import { Grid } from '../../../domain/shared';
import type { Element } from '../../../domain/element';
import type { ElementId } from '../../../domain/shared';
import type { CanvasViewportStore, SelectionStore } from '../../../application/services';
import { toSelectableItems } from '../../../application/services';
import { useDragSelection } from '../hooks/use-drag-selection';
import { useElementCopyPaste } from '../hooks/use-element-copy-paste';
import { useElementDelete } from '../hooks/use-element-delete';
import { useElementDuplicate } from '../hooks/use-element-duplicate';
import { useElementMove } from '../hooks/use-element-move';
import { useElementResize } from '../hooks/use-element-resize';
import { usePan } from '../hooks/use-pan';
import { useSelection } from '../hooks/use-selection';
import { useSelectionKeyboard } from '../hooks/use-selection-keyboard';
import { useSpacePressed } from '../hooks/use-space-pressed';
import { useZoom } from '../hooks/use-zoom';
import { ElementView } from '../renderers';
import type { ElementRendererRegistry } from '../renderers';
import { SelectionOverlay } from './selection-overlay';
import { ViewportControls } from './viewport-controls';

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
    outline: 2px solid var(--rr-color-accent-default, #2563eb);
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
  border: 1px solid var(--rr-color-accent-default, #2563eb);
  background-color: rgba(37, 99, 235, 0.08);
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
    linear-gradient(to right, var(--rr-color-border-subtle, #e2e8f0) 1px, transparent 1px),
    linear-gradient(to bottom, var(--rr-color-border-subtle, #e2e8f0) 1px, transparent 1px);
  opacity: 0.5;
`;

const Hint = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
  color: var(--rr-color-text-muted, #64748b);
  font-size: 14px;
`;

const CANVAS_GRID = Grid.default();

export interface CanvasProps {
  readonly store: CanvasViewportStore;
  readonly selectionStore: SelectionStore;
  readonly elements?: readonly Element[];
  readonly renderers?: ElementRendererRegistry;
  readonly onMoveElements?: (elements: readonly Element[]) => void;
  readonly onResizeElements?: (elements: readonly Element[]) => void;
  readonly onDeleteElements?: (elements: readonly Element[]) => void;
  readonly onDuplicateElements?: (
    elements: readonly Element[],
    duplicatedIds: readonly string[],
  ) => void;
  readonly onPasteElements?: (elements: readonly Element[], pastedIds: readonly string[]) => void;
  readonly generateId?: () => ElementId;
}

export function Canvas({
  store,
  selectionStore,
  elements = [],
  renderers,
  onMoveElements,
  onResizeElements,
  onDeleteElements,
  onDuplicateElements,
  onPasteElements,
  generateId,
}: CanvasProps): ReactElement {
  const viewport = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const selection = useSyncExternalStore(selectionStore.subscribe, selectionStore.getSnapshot);
  const spacePressed = useSpacePressed();
  const { isPanning, ref: panRef } = usePan({ onPan: store.pan, spacePressed });
  const { ref: zoomRef } = useZoom({ onZoom: store.zoom });

  const items = useMemo(() => toSelectableItems(elements), [elements]);

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
    spacePressed,
  });

  const { isResizing, ref: elementResizeRef } = useElementResize({
    elements,
    viewport,
    selectedIds: selection.selectedIds,
    onResizeElements,
    spacePressed,
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

  const { ref: elementDeleteRef } = useElementDelete({
    elements,
    selectedIds: selection.selectedIds,
    onDeleteElements,
    onSelectionCleared: handleClear,
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
  });

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      panRef.current = node;
      zoomRef.current = node;
      selectionRef.current = node;
      dragSelectionRef.current = node;
      selectionKeyboardRef.current = node;
      elementMoveRef.current = node;
      elementResizeRef.current = node;
      elementDeleteRef.current = node;
      elementDuplicateRef.current = node;
      elementCopyPasteRef.current = node;
    },
    [
      panRef,
      zoomRef,
      selectionRef,
      dragSelectionRef,
      selectionKeyboardRef,
      elementMoveRef,
      elementResizeRef,
      elementDeleteRef,
      elementDuplicateRef,
      elementCopyPasteRef,
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

  return (
    <CanvasContainer
      ref={setContainerRef}
      role="application"
      aria-label="Canvas"
      aria-keyshortcuts="Escape Control+A Meta+A Delete Control+D Meta+D Control+C Meta+C Control+V Meta+V"
      aria-grabbed={isPanning}
      tabIndex={0}
      data-panning={isPanning}
      data-pan-key={spacePressed}
      data-selecting={marqueeRect !== null}
      data-moving={isMoving}
      data-resizing={isResizing}
      data-scale={transform.scale}
    >
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
        {elements.map((element) => (
          <ElementView
            key={element.id.value}
            element={element}
            selected={selectedIdSet.has(element.id.value)}
            renderers={renderers}
          />
        ))}
        <SelectionOverlay items={selectedItems} />
        {items.length === 0 ? (
          <Hint>
            Drag to select · Space + drag to pan · Ctrl/Cmd + scroll to zoom · Esc to clear ·
            Ctrl/Cmd + A to select all · Delete to remove · Ctrl/Cmd + D to duplicate · Ctrl/Cmd + C
            to copy · Ctrl/Cmd + V to paste
          </Hint>
        ) : null}
      </World>
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
      <ViewportControls store={store} />
    </CanvasContainer>
  );
}
