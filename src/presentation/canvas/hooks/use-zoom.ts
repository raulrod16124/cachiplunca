import { useEffect, useRef } from 'react';
import { Position } from '../../../domain/shared';

export interface UseZoomOptions {
  readonly onZoom: (factor: number, anchorScreen: Position) => void;
  readonly disabled?: boolean;
  readonly sensitivity?: number;
}

export interface UseZoomResult {
  readonly ref: React.RefObject<HTMLElement | null>;
}

export const DEFAULT_ZOOM_SENSITIVITY = 0.15;

export function useZoom({
  onZoom,
  disabled = false,
  sensitivity = DEFAULT_ZOOM_SENSITIVITY,
}: UseZoomOptions): UseZoomResult {
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (element === null || disabled) {
      return;
    }

    function createHandler(canvas: HTMLElement) {
      function handleWheel(event: WheelEvent): void {
        if (!event.ctrlKey && !event.metaKey) {
          return;
        }

        event.preventDefault();

        const rect = canvas.getBoundingClientRect();
        const anchor = Position.create(event.clientX - rect.left, event.clientY - rect.top);
        const direction = event.deltaY < 0 ? 1 : -1;
        const factor = Math.exp(direction * sensitivity);

        onZoom(factor, anchor);
      }

      return { handleWheel };
    }

    const { handleWheel } = createHandler(element);

    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [disabled, onZoom, sensitivity]);

  return { ref: elementRef };
}
