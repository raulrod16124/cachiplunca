import { useEffect, useRef, useState } from 'react';
import { Position } from '../../../domain/shared';

export interface UsePanOptions {
  readonly onPan: (delta: Position) => void;
  readonly disabled?: boolean;
}

export interface UsePanResult {
  readonly isPanning: boolean;
  readonly ref: React.RefObject<HTMLElement | null>;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest('button, a, input, textarea, select, [role="button"]') !== null;
}

export function usePan({ onPan, disabled = false }: UsePanOptions): UsePanResult {
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const lastPositionRef = useRef<{ readonly x: number; readonly y: number } | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (element === null || disabled) {
      return;
    }

    function createHandlers(canvas: HTMLElement) {
      function handlePointerDown(event: PointerEvent): void {
        if (event.button !== 0) {
          return;
        }

        if (isInteractiveTarget(event.target)) {
          return;
        }

        canvas.setPointerCapture(event.pointerId);
        pointerIdRef.current = event.pointerId;
        lastPositionRef.current = { x: event.clientX, y: event.clientY };
        isPanningRef.current = true;
        setIsPanning(true);
      }

      function handlePointerMove(event: PointerEvent): void {
        if (
          !isPanningRef.current ||
          pointerIdRef.current !== event.pointerId ||
          lastPositionRef.current === null
        ) {
          return;
        }

        const last = lastPositionRef.current;
        const delta = Position.create(event.clientX - last.x, event.clientY - last.y);
        lastPositionRef.current = { x: event.clientX, y: event.clientY };
        onPan(delta);
      }

      function handlePointerUp(event: PointerEvent): void {
        if (!isPanningRef.current || pointerIdRef.current !== event.pointerId) {
          return;
        }

        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
        pointerIdRef.current = null;
        lastPositionRef.current = null;
        isPanningRef.current = false;
        setIsPanning(false);
      }

      return { handlePointerDown, handlePointerMove, handlePointerUp };
    }

    const { handlePointerDown, handlePointerMove, handlePointerUp } = createHandlers(element);

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerUp);
    element.addEventListener('pointercancel', handlePointerUp);
    element.addEventListener('pointerleave', handlePointerUp);

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerUp);
      element.removeEventListener('pointerleave', handlePointerUp);
    };
  }, [disabled, onPan]);

  return {
    isPanning,
    ref: elementRef,
  };
}
