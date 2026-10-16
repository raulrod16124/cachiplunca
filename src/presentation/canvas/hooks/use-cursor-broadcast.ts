import { useEffect, useRef } from 'react';
import { Position, type Viewport } from '../../../domain/shared';

export interface UseCursorBroadcastOptions {
  readonly onCursorMove: (position: Position) => void;
  readonly viewport: Viewport;
  readonly disabled?: boolean;
}

export interface UseCursorBroadcastResult {
  readonly ref: React.RefObject<HTMLElement | null>;
}

export function useCursorBroadcast({
  onCursorMove,
  viewport,
  disabled = false,
}: UseCursorBroadcastOptions): UseCursorBroadcastResult {
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (element === null || disabled) {
      return;
    }

    const target = element;
    function handlePointerMove(event: PointerEvent): void {
      const rect = target.getBoundingClientRect();
      const screen = Position.create(event.clientX - rect.left, event.clientY - rect.top);
      onCursorMove(viewport.screenToWorld(screen));
    }

    element.addEventListener('pointermove', handlePointerMove);

    return () => {
      element.removeEventListener('pointermove', handlePointerMove);
    };
  }, [disabled, onCursorMove, viewport]);

  return { ref: elementRef };
}
