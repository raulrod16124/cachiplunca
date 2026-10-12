import type { RealtimeConnectionStatus } from '../ports';
import type { Unsubscribe } from '../../shared/types';

export interface RealtimeConnectionSnapshot {
  readonly status: RealtimeConnectionStatus;
}

export interface RealtimeConnectionStore {
  readonly getSnapshot: () => RealtimeConnectionSnapshot;
  readonly subscribe: (onChange: () => void) => Unsubscribe;
  readonly setStatus: (status: RealtimeConnectionStatus) => void;
}

export function createRealtimeConnectionStore(
  initial: RealtimeConnectionStatus = 'connected',
): RealtimeConnectionStore {
  let snapshot: RealtimeConnectionSnapshot = { status: initial };
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => snapshot,
    subscribe(onChange) {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    setStatus(status) {
      if (snapshot.status === status) {
        return;
      }

      snapshot = { status };
      for (const listener of listeners) {
        listener();
      }
    },
  };
}
