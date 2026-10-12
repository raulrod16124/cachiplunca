import { createRealtimeConnectionStore } from '../../../../application/services';

describe('createRealtimeConnectionStore', () => {
  it('starts connected by default', () => {
    const store = createRealtimeConnectionStore();

    expect(store.getSnapshot().status).toBe('connected');
  });

  it('accepts an initial status', () => {
    const store = createRealtimeConnectionStore('reconnecting');

    expect(store.getSnapshot().status).toBe('reconnecting');
  });

  it('publishes a new status to subscribers', () => {
    const store = createRealtimeConnectionStore();
    const listener = jest.fn();
    store.subscribe(listener);

    store.setStatus('reconnecting');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().status).toBe('reconnecting');
  });

  it('does not notify nor replace the snapshot when the status is unchanged', () => {
    const store = createRealtimeConnectionStore('reconnecting');
    const listener = jest.fn();
    const before = store.getSnapshot();
    store.subscribe(listener);

    store.setStatus('reconnecting');

    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(before);
  });

  it('keeps the snapshot reference stable across unrelated reads', () => {
    const store = createRealtimeConnectionStore();

    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it('stops notifying after unsubscribe', () => {
    const store = createRealtimeConnectionStore();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.setStatus('reconnecting');

    expect(listener).not.toHaveBeenCalled();
  });

  it('treats unsubscribe as idempotent', () => {
    const store = createRealtimeConnectionStore();
    const unsubscribe = store.subscribe(jest.fn());

    unsubscribe();

    expect(() => unsubscribe()).not.toThrow();
  });
});
