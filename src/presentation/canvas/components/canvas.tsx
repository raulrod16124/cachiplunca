import type { ReactElement, RefObject } from 'react';
import { useSyncExternalStore } from 'react';
import styled from 'styled-components';
import type { CanvasViewportStore } from '../../../application/services';
import { usePan } from '../hooks/use-pan';

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

const Grid = styled.div`
  position: absolute;
  inset: -100%;
  width: 300%;
  height: 300%;
  background-image:
    linear-gradient(to right, var(--rr-color-border-subtle, #e2e8f0) 1px, transparent 1px),
    linear-gradient(to bottom, var(--rr-color-border-subtle, #e2e8f0) 1px, transparent 1px);
  background-size: 40px 40px;
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

export interface CanvasProps {
  readonly store: CanvasViewportStore;
}

export function Canvas({ store }: CanvasProps): ReactElement {
  const viewport = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const { isPanning, ref } = usePan({ onPan: store.pan });

  const transform = viewport.transform;
  const translateX = -transform.x * transform.scale;
  const translateY = -transform.y * transform.scale;

  return (
    <CanvasContainer
      ref={ref as RefObject<HTMLDivElement>}
      role="application"
      aria-label="Canvas"
      aria-grabbed={isPanning}
      data-panning={isPanning}
    >
      <World
        style={{
          transform: `translate(${translateX}px, ${translateY}px) scale(${transform.scale})`,
        }}
      >
        <Grid />
        <Hint>Drag to pan around the workspace</Hint>
      </World>
    </CanvasContainer>
  );
}
