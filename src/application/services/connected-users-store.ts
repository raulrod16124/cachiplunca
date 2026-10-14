import type { Presence } from '../../domain/collaboration';
import type { WorkspaceId } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import type { Unsubscribe } from '../../shared/types';
import type { PresenceEvent, PresencePort } from '../ports';

export interface ConnectedUsersSnapshot {
  readonly users: readonly Presence[];
  readonly error: AppError | null;
}

export interface ConnectedUsersStore {
  readonly getSnapshot: () => ConnectedUsersSnapshot;
  readonly subscribe: (onChange: () => void) => Unsubscribe;
}

const EMPTY_SNAPSHOT: ConnectedUsersSnapshot = { users: [], error: null };

export const EMPTY_CONNECTED_USERS_STORE: ConnectedUsersStore = {
  getSnapshot: () => EMPTY_SNAPSHOT,
  subscribe: () => () => undefined,
};

function sortUsers(users: readonly Presence[]): readonly Presence[] {
  return [...users].sort((a, b) => a.userId.value.localeCompare(b.userId.value));
}

function sameUsers(a: readonly Presence[], b: readonly Presence[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index += 1) {
    const left = a[index];
    const right = b[index];

    if (left === right) {
      continue;
    }
    if (!left.equals(right)) {
      return false;
    }
  }

  return true;
}

export function reduceConnectedUsers(
  users: readonly Presence[],
  event: PresenceEvent,
  workspaceId: WorkspaceId,
): readonly Presence[] {
  if (!event.workspaceId.equals(workspaceId)) {
    return users;
  }

  const byUserId = new Map<string, Presence>();
  for (const user of users) {
    byUserId.set(user.userId.value, user);
  }

  for (const change of event.changes) {
    switch (change.kind) {
      case 'joined':
      case 'updated': {
        if (change.presence.isFor(workspaceId)) {
          byUserId.set(change.presence.userId.value, change.presence);
        }
        break;
      }
      case 'left':
        byUserId.delete(change.userId.value);
        break;
    }
  }

  return sortUsers([...byUserId.values()]);
}

export function createConnectedUsersStore(
  presencePort: PresencePort,
  workspaceId: WorkspaceId,
): ConnectedUsersStore {
  const listeners = new Set<() => void>();
  let snapshot: ConnectedUsersSnapshot = EMPTY_SNAPSHOT;
  let unsubscribePort: Unsubscribe | null = null;

  function publish(next: ConnectedUsersSnapshot): void {
    if (snapshot.error === next.error && sameUsers(snapshot.users, next.users)) {
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

    unsubscribePort = presencePort.subscribe(
      workspaceId,
      (event) => {
        publish({ users: reduceConnectedUsers(snapshot.users, event, workspaceId), error: null });
      },
      (error) => {
        publish({ users: snapshot.users, error });
      },
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
