import { Position, Size, Viewport } from '../../domain/shared';
import type { Unsubscribe } from '../../shared/types';

export interface CanvasViewportStore {
  readonly getSnapshot: () => Viewport;
  readonly subscribe: (onChange: () => void) => Unsubscribe;
  readonly pan: (screenDelta: Position) => void;
  readonly reset: (size?: Size) => void;
}

export function createCanvasViewportStore(
  initialSize: Size = Size.create(800, 600),
): CanvasViewportStore {
  let viewport: Viewport = Viewport.default(initialSize);
  const listeners = new Set<() => void>();

  function publish(next: Viewport): void {
    if (viewport.equals(next)) {
      return;
    }
    viewport = next;
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    getSnapshot: () => viewport,
    subscribe(onChange) {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    pan(screenDelta) {
      publish(viewport.pan(screenDelta));
    },
    reset(size) {
      publish(Viewport.default(size ?? viewport.size));
    },
  };
}
