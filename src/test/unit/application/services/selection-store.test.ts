import { createSelectionStore } from '../../../../application/services/selection-store';

describe('createSelectionStore', () => {
  it('starts with no selection by default', () => {
    expect(createSelectionStore().getSnapshot()).toEqual({ selectedId: null });
  });

  it('starts with the provided id', () => {
    expect(createSelectionStore('first').getSnapshot()).toEqual({ selectedId: 'first' });
  });

  it('selects an id and notifies subscribers', () => {
    const store = createSelectionStore();
    const listener = jest.fn();

    const unsubscribe = store.subscribe(listener);
    store.select('first');

    expect(store.getSnapshot().selectedId).toBe('first');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('does not notify when selecting the same id', () => {
    const store = createSelectionStore('first');
    const listener = jest.fn();

    const unsubscribe = store.subscribe(listener);
    store.select('first');

    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('clears the selection', () => {
    const store = createSelectionStore('first');
    const listener = jest.fn();

    const unsubscribe = store.subscribe(listener);
    store.clear();

    expect(store.getSnapshot().selectedId).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('does not notify when clearing an empty selection', () => {
    const store = createSelectionStore();
    const listener = jest.fn();

    const unsubscribe = store.subscribe(listener);
    store.clear();

    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('allows unsubscribing', () => {
    const store = createSelectionStore();
    const listener = jest.fn();

    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.select('first');

    expect(listener).not.toHaveBeenCalled();
  });
});
