import { createSelectionStore } from '../../../../application/services/selection-store';

describe('createSelectionStore', () => {
  it('starts with no selection by default', () => {
    expect(createSelectionStore().getSnapshot()).toEqual({ selectedIds: [] });
  });

  it('starts with the provided ids', () => {
    expect(createSelectionStore(['first', 'second']).getSnapshot()).toEqual({
      selectedIds: ['first', 'second'],
    });
  });

  it('selects a single id and notifies subscribers', () => {
    const store = createSelectionStore();
    const listener = jest.fn();

    const unsubscribe = store.subscribe(listener);
    store.select('first');

    expect(store.getSnapshot().selectedIds).toEqual(['first']);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('replaces the current selection when selecting another id', () => {
    const store = createSelectionStore(['first', 'second']);
    const listener = jest.fn();

    const unsubscribe = store.subscribe(listener);
    store.select('third');

    expect(store.getSnapshot().selectedIds).toEqual(['third']);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('does not notify when selecting the already selected single id', () => {
    const store = createSelectionStore(['first']);
    const listener = jest.fn();

    const unsubscribe = store.subscribe(listener);
    store.select('first');

    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('toggles an id on when it is not selected', () => {
    const store = createSelectionStore(['first']);
    const listener = jest.fn();

    const unsubscribe = store.subscribe(listener);
    store.toggle('second');

    expect(store.getSnapshot().selectedIds).toEqual(['first', 'second']);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('toggles an id off when it is already selected', () => {
    const store = createSelectionStore(['first', 'second']);
    const listener = jest.fn();

    const unsubscribe = store.subscribe(listener);
    store.toggle('first');

    expect(store.getSnapshot().selectedIds).toEqual(['second']);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('keeps a stable snapshot reference when selecting the same single id', () => {
    const store = createSelectionStore(['first']);
    const before = store.getSnapshot();

    store.select('first');

    expect(store.getSnapshot()).toBe(before);
  });

  it('clears the selection', () => {
    const store = createSelectionStore(['first', 'second']);
    const listener = jest.fn();

    const unsubscribe = store.subscribe(listener);
    store.clear();

    expect(store.getSnapshot().selectedIds).toEqual([]);
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
