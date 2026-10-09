import type { Unsubscribe } from '../../shared/types';
import type { AuthPort, AuthUser } from '../ports';

export type SessionState =
  | { readonly status: 'loading' }
  | { readonly status: 'authenticated'; readonly user: AuthUser }
  | { readonly status: 'anonymous' };

export interface SessionStore {
  readonly getSnapshot: () => SessionState;
  readonly subscribe: (onChange: () => void) => Unsubscribe;
}

const LOADING_STATE: SessionState = { status: 'loading' };
const ANONYMOUS_STATE: SessionState = { status: 'anonymous' };

function toSessionState(user: AuthUser | null): SessionState {
  return user === null ? ANONYMOUS_STATE : { status: 'authenticated', user };
}

function sameSessionState(a: SessionState, b: SessionState): boolean {
  if (a.status !== b.status) {
    return false;
  }
  if (a.status === 'authenticated' && b.status === 'authenticated') {
    return a.user.uid === b.user.uid;
  }
  return true;
}

export function createSessionStore(authPort: AuthPort): SessionStore {
  const listeners = new Set<() => void>();
  let snapshot: SessionState = LOADING_STATE;
  let unsubscribePort: Unsubscribe | null = null;

  function publish(next: SessionState): void {
    if (sameSessionState(snapshot, next)) {
      return;
    }
    snapshot = next;
    for (const listener of listeners) {
      listener();
    }
  }

  function connect(): void {
    if (unsubscribePort !== null) {
      return;
    }
    unsubscribePort = authPort.observeSession(
      (user) => publish(toSessionState(user)),
      () => publish(ANONYMOUS_STATE),
    );
  }

  function disconnect(): void {
    if (unsubscribePort === null) {
      return;
    }
    unsubscribePort();
    unsubscribePort = null;
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(onChange) {
      listeners.add(onChange);
      connect();
      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) {
          disconnect();
        }
      };
    },
  };
}
