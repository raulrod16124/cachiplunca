import { useEffect, useRef, useState } from 'react';
import { Position } from '../../../domain/shared';

export interface UsePanOptions {
  readonly onPan: (delta: Position) => void;
  readonly spacePressed?: boolean;
  readonly disabled?: boolean;
}

export interface UsePanResult {
  readonly isPanning: boolean;
  readonly ref: React.RefObject<HTMLElement | null>;
}

export function usePan({
  onPan,
  spacePressed = false,
  disabled = false,
}: UsePanOptions): UsePanResult {
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const lastPositionRef = useRef<{ readonly x: number; readonly y: number } | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const latestRef = useRef({ onPan, spacePressed });
  latestRef.current = { onPan, spacePressed };

  useEffect(() => {
    const element = elementRef.current;
    if (element === null || disabled) {
      return;
    }

    function createHandlers(canvas: HTMLElement) {
      function shouldStartPan(event: PointerEvent): boolean {
        if (event.button === 1) {
          return true;
        }

        return event.button === 0 && latestRef.current.spacePressed;
      }

      function handlePointerDown(event: PointerEvent): void {
        if (!shouldStartPan(event)) {
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
        latestRef.current.onPan(delta);
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

      function handleWheel(event: WheelEvent): void {
        if (event.ctrlKey || event.metaKey) {
          return;
        }

        event.preventDefault();
        latestRef.current.onPan(Position.create(-event.deltaX, -event.deltaY));
      }

      return { handlePointerDown, handlePointerMove, handlePointerUp, handleWheel };
    }

    const { handlePointerDown, handlePointerMove, handlePointerUp, handleWheel } =
      createHandlers(element);

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerUp);
    element.addEventListener('pointercancel', handlePointerUp);
    element.addEventListener('pointerleave', handlePointerUp);
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerUp);
      element.removeEventListener('pointerleave', handlePointerUp);
      element.removeEventListener('wheel', handleWheel);
    };
  }, [disabled]);

  return {
    isPanning,
    ref: elementRef,
  };
}
