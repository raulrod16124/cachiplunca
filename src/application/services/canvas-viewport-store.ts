import { Bounds, Position, Size, Viewport } from '../../domain/shared';
import type { Unsubscribe } from '../../shared/types';

export const MIN_CANVAS_SCALE = 0.1;
export const MAX_CANVAS_SCALE = 5;
export const DEFAULT_FIT_PADDING = 48;

export interface CanvasViewportStore {
  readonly getSnapshot: () => Viewport;
  readonly subscribe: (onChange: () => void) => Unsubscribe;
  readonly pan: (screenDelta: Position) => void;
  readonly zoom: (factor: number, anchorScreen: Position) => void;
  readonly setScale: (scale: number) => void;
  readonly resize: (size: Size) => void;
  readonly reset: (size?: Size) => void;
  readonly center: (contentBounds: Bounds) => void;
  readonly fit: (contentBounds: Bounds | null, padding?: number) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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
    zoom(factor, anchorScreen) {
      const currentScale = viewport.scale;
      const targetScale = clamp(currentScale * factor, MIN_CANVAS_SCALE, MAX_CANVAS_SCALE);
      publish(viewport.zoom(targetScale / currentScale, anchorScreen));
    },
    setScale(scale) {
      const currentScale = viewport.scale;
      const targetScale = clamp(scale, MIN_CANVAS_SCALE, MAX_CANVAS_SCALE);

      if (targetScale === currentScale) {
        return;
      }

      const anchorScreen = Position.create(viewport.size.width / 2, viewport.size.height / 2);
      publish(viewport.zoom(targetScale / currentScale, anchorScreen));
    },
    resize(size) {
      publish(Viewport.create(viewport.transform, size));
    },
    reset(size) {
      publish(Viewport.default(size ?? viewport.size));
    },
    center(contentBounds) {
      publish(viewport.center(contentBounds));
    },
    fit(contentBounds, padding = DEFAULT_FIT_PADDING) {
      if (contentBounds === null || contentBounds.size.isEmpty()) {
        publish(Viewport.default(viewport.size));
        return;
      }

      publish(viewport.fit(contentBounds, padding, MIN_CANVAS_SCALE, MAX_CANVAS_SCALE));
    },
  };
}
