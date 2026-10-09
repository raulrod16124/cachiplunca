import { Bounds, Position, Size, Viewport } from '../../../../domain/shared';
import {
  createCanvasViewportStore,
  MAX_CANVAS_SCALE,
  MIN_CANVAS_SCALE,
} from '../../../../application/services/canvas-viewport-store';

describe('createCanvasViewportStore', () => {
  it('starts with a default viewport', () => {
    const store = createCanvasViewportStore(Size.create(800, 600));

    expect(store.getSnapshot()).toEqual(Viewport.default(Size.create(800, 600)));
  });

  it('pans the viewport by a screen delta', () => {
    const store = createCanvasViewportStore(Size.create(800, 600));

    store.pan(Position.create(50, 30));

    expect(store.getSnapshot().transform.translation).toEqual(Position.create(-50, -30));
  });

  it('notifies subscribers when the viewport changes', () => {
    const store = createCanvasViewportStore(Size.create(800, 600));
    const listener = jest.fn();

    const unsubscribe = store.subscribe(listener);
    store.pan(Position.create(10, 0));

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('does not notify subscribers when the viewport is unchanged', () => {
    const store = createCanvasViewportStore(Size.create(800, 600));
    const listener = jest.fn();

    const unsubscribe = store.subscribe(listener);
    store.pan(Position.create(0, 0));

    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('allows unsubscribing', () => {
    const store = createCanvasViewportStore(Size.create(800, 600));
    const listener = jest.fn();

    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.pan(Position.create(10, 0));

    expect(listener).not.toHaveBeenCalled();
  });

  it('resets the viewport to default', () => {
    const store = createCanvasViewportStore(Size.create(800, 600));

    store.pan(Position.create(100, 100));
    store.reset();

    expect(store.getSnapshot()).toEqual(Viewport.default(Size.create(800, 600)));
  });

  it('resets to a new size when provided', () => {
    const store = createCanvasViewportStore(Size.create(800, 600));

    store.pan(Position.create(100, 100));
    store.reset(Size.create(1024, 768));

    expect(store.getSnapshot()).toEqual(Viewport.default(Size.create(1024, 768)));
  });

  describe('zoom', () => {
    it('zooms in around the anchor point', () => {
      const store = createCanvasViewportStore(Size.create(800, 600));

      store.zoom(2, Position.create(200, 150));

      expect(store.getSnapshot().scale).toBe(2);
    });

    it('keeps the anchor point stable on screen', () => {
      const store = createCanvasViewportStore(Size.create(800, 600));
      const anchor = Position.create(200, 150);
      const worldAnchor = store.getSnapshot().screenToWorld(anchor);

      store.zoom(2, anchor);

      expect(store.getSnapshot().worldToScreen(worldAnchor).x).toBeCloseTo(anchor.x);
      expect(store.getSnapshot().worldToScreen(worldAnchor).y).toBeCloseTo(anchor.y);
    });

    it('does not zoom in beyond the maximum scale', () => {
      const store = createCanvasViewportStore(Size.create(800, 600));

      store.zoom(100, Position.create(0, 0));

      expect(store.getSnapshot().scale).toBe(MAX_CANVAS_SCALE);
    });

    it('does not zoom out below the minimum scale', () => {
      const store = createCanvasViewportStore(Size.create(800, 600));

      store.zoom(0.001, Position.create(0, 0));

      expect(store.getSnapshot().scale).toBe(MIN_CANVAS_SCALE);
    });

    it('notifies subscribers when the zoom changes', () => {
      const store = createCanvasViewportStore(Size.create(800, 600));
      const listener = jest.fn();

      const unsubscribe = store.subscribe(listener);
      store.zoom(2, Position.create(100, 100));

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
    });

    it('does not notify subscribers when already at the maximum scale', () => {
      const store = createCanvasViewportStore(Size.create(800, 600));
      const listener = jest.fn();

      store.zoom(MAX_CANVAS_SCALE, Position.create(0, 0));
      const unsubscribe = store.subscribe(listener);
      store.zoom(2, Position.create(100, 100));

      expect(listener).not.toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('fit', () => {
    it('resets the viewport when the content bounds are null', () => {
      const store = createCanvasViewportStore(Size.create(800, 600));

      store.pan(Position.create(100, 100));
      store.fit(null);

      expect(store.getSnapshot()).toEqual(Viewport.default(Size.create(800, 600)));
    });

    it('resets the viewport when the content bounds are empty', () => {
      const store = createCanvasViewportStore(Size.create(800, 600));

      store.zoom(2, Position.create(100, 100));
      store.fit(Bounds.fromXYWH(0, 0, 0, 0));

      expect(store.getSnapshot()).toEqual(Viewport.default(Size.create(800, 600)));
    });

    it('fits the content bounds into the viewport', () => {
      const store = createCanvasViewportStore(Size.create(800, 600));

      store.fit(Bounds.fromXYWH(0, 0, 400, 300), 0);

      expect(store.getSnapshot().scale).toBe(2);
    });

    it('clamps the fitted scale to the allowed range', () => {
      const store = createCanvasViewportStore(Size.create(800, 600));

      store.fit(Bounds.fromXYWH(0, 0, 40, 30), 0);

      expect(store.getSnapshot().scale).toBe(MAX_CANVAS_SCALE);
    });

    it('clamps a tiny fit to the minimum scale', () => {
      const store = createCanvasViewportStore(Size.create(800, 600));

      store.fit(Bounds.fromXYWH(0, 0, 100000, 100000), 0);

      expect(store.getSnapshot().scale).toBe(MIN_CANVAS_SCALE);
    });

    it('notifies subscribers when the fit changes the viewport', () => {
      const store = createCanvasViewportStore(Size.create(800, 600));
      const listener = jest.fn();

      const unsubscribe = store.subscribe(listener);
      store.fit(Bounds.fromXYWH(0, 0, 400, 300), 0);

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
    });
  });
});
