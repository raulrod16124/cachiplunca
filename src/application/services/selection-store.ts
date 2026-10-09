import type { Unsubscribe } from '../../shared/types';

export interface SelectionSnapshot {
  readonly selectedId: string | null;
}

export interface SelectionStore {
  readonly getSnapshot: () => SelectionSnapshot;
  readonly subscribe: (onChange: () => void) => Unsubscribe;
  readonly select: (id: string | null) => void;
  readonly clear: () => void;
}

export function createSelectionStore(initialId: string | null = null): SelectionStore {
  let snapshot: SelectionSnapshot = { selectedId: initialId };
  const listeners = new Set<() => void>();

  function publish(next: SelectionSnapshot): void {
    if (snapshot.selectedId === next.selectedId) {
      return;
    }
    snapshot = next;
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(onChange) {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    select(id) {
      publish({ selectedId: id });
    },
    clear() {
      publish({ selectedId: null });
    },
  };
}
