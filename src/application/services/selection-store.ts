import type { Unsubscribe } from '../../shared/types';

export interface SelectionSnapshot {
  readonly selectedIds: readonly string[];
}

export interface SelectionStore {
  readonly getSnapshot: () => SelectionSnapshot;
  readonly subscribe: (onChange: () => void) => Unsubscribe;
  readonly select: (id: string) => void;
  readonly toggle: (id: string) => void;
  readonly clear: () => void;
}

function sameMembers(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const members = new Set(a);

  return b.every((id) => members.has(id));
}

export function createSelectionStore(initialIds: readonly string[] = []): SelectionStore {
  let snapshot: SelectionSnapshot = { selectedIds: [...initialIds] };
  const listeners = new Set<() => void>();

  function publish(nextIds: readonly string[]): void {
    if (sameMembers(snapshot.selectedIds, nextIds)) {
      return;
    }

    snapshot = { selectedIds: nextIds };
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
      if (snapshot.selectedIds.length === 1 && snapshot.selectedIds[0] === id) {
        return;
      }

      publish([id]);
    },
    toggle(id) {
      const isSelected = snapshot.selectedIds.includes(id);
      publish(
        isSelected
          ? snapshot.selectedIds.filter((entry) => entry !== id)
          : [...snapshot.selectedIds, id],
      );
    },
    clear() {
      if (snapshot.selectedIds.length === 0) {
        return;
      }

      publish([]);
    },
  };
}
