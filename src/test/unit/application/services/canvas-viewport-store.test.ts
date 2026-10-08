import { Position, Size, Viewport } from '../../../../domain/shared';
import { createCanvasViewportStore } from '../../../../application/services/canvas-viewport-store';

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
});
