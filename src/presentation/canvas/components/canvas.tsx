import type { ReactElement } from 'react';
import { useCallback, useSyncExternalStore } from 'react';
import styled from 'styled-components';
import { Grid } from '../../../domain/shared';
import type {
  CanvasViewportStore,
  SelectableItem,
  SelectionStore,
} from '../../../application/services';
import { usePan } from '../hooks/use-pan';
import { useSelection } from '../hooks/use-selection';
import { useZoom } from '../hooks/use-zoom';
import { SelectionOverlay } from './selection-overlay';
import { ViewportControls } from './viewport-controls';

const CanvasContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
  cursor: grab;
  user-select: none;

  &[data-panning='true'] {
    cursor: grabbing;
  }
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

const SelectableNode = styled.div`
  position: absolute;
  box-sizing: border-box;
  border: 1px solid var(--rr-color-border-default, #cbd5e1);
  border-radius: 4px;
  background: var(--rr-color-background-default, #ffffff);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  cursor: pointer;

  &[data-selected='true'] {
    border-color: var(--rr-color-accent-default, #2563eb);
  }
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
  readonly items?: readonly SelectableItem[];
}

export function Canvas({ store, selectionStore, items = [] }: CanvasProps): ReactElement {
  const viewport = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const selection = useSyncExternalStore(selectionStore.subscribe, selectionStore.getSnapshot);
  const { isPanning, ref: panRef } = usePan({ onPan: store.pan });
  const { ref: zoomRef } = useZoom({ onZoom: store.zoom });
  const { ref: selectionRef } = useSelection({
    items,
    viewport,
    onSelect: selectionStore.select,
  });

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      panRef.current = node;
      zoomRef.current = node;
      selectionRef.current = node;
    },
    [panRef, zoomRef, selectionRef],
  );

  const transform = viewport.transform;
  const translateX = -transform.x * transform.scale;
  const translateY = -transform.y * transform.scale;

  const gridStep = CANVAS_GRID.scaledSpacing(transform.scale);
  const gridOffset = CANVAS_GRID.offsetFor(transform);

  const selectedItem = items.find((item) => item.id === selection.selectedId) ?? null;

  return (
    <CanvasContainer
      ref={setContainerRef}
      role="application"
      aria-label="Canvas"
      aria-grabbed={isPanning}
      data-panning={isPanning}
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
        {items.map((item) => (
          <SelectableNode
            key={item.id}
            data-selectable="true"
            data-selected={item.id === selection.selectedId}
            data-testid={`canvas-item-${item.id}`}
            style={{
              left: item.bounds.x,
              top: item.bounds.y,
              width: item.bounds.width,
              height: item.bounds.height,
            }}
          />
        ))}
        <SelectionOverlay item={selectedItem} />
        {items.length === 0 ? <Hint>Drag to pan · Ctrl/Cmd + scroll to zoom</Hint> : null}
      </World>
      <ViewportControls store={store} />
    </CanvasContainer>
  );
}
