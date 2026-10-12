import type { Presence } from '../../domain/collaboration';
import type { Position, UserId, WorkspaceId } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import type { Unsubscribe } from '../../shared/types';
import type { PresenceEvent, PresencePort } from '../ports';

export interface RemoteCursor {
  readonly userId: string;
  readonly position: Position;
  readonly lastSeenAt: Date;
}

export interface RemoteCursorsSnapshot {
  readonly cursors: readonly RemoteCursor[];
  readonly error: AppError | null;
}

export interface RemoteCursorsStore {
  readonly getSnapshot: () => RemoteCursorsSnapshot;
  readonly subscribe: (onChange: () => void) => Unsubscribe;
}

const EMPTY_SNAPSHOT: RemoteCursorsSnapshot = { cursors: [], error: null };

export const EMPTY_REMOTE_CURSORS_STORE: RemoteCursorsStore = {
  getSnapshot: () => EMPTY_SNAPSHOT,
  subscribe: () => () => undefined,
};

function toRemoteCursor(presence: Presence): RemoteCursor | null {
  const cursor = presence.cursor;

  if (cursor === null) {
    return null;
  }

  return { userId: presence.userId.value, position: cursor, lastSeenAt: presence.lastSeenAt };
}

function sortCursors(cursors: readonly RemoteCursor[]): readonly RemoteCursor[] {
  return [...cursors].sort((a, b) => a.userId.localeCompare(b.userId));
}

function sameCursors(a: readonly RemoteCursor[], b: readonly RemoteCursor[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index += 1) {
    const left = a[index];
    const right = b[index];

    if (
      left.userId !== right.userId ||
      left.lastSeenAt.getTime() !== right.lastSeenAt.getTime() ||
      !left.position.equals(right.position)
    ) {
      return false;
    }
  }

  return true;
}

export function reduceRemoteCursors(
  cursors: readonly RemoteCursor[],
  event: PresenceEvent,
  workspaceId: WorkspaceId,
  localUserId: UserId,
): readonly RemoteCursor[] {
  if (!event.workspaceId.equals(workspaceId)) {
    return cursors;
  }

  const byUserId = new Map<string, RemoteCursor>();
  for (const cursor of cursors) {
    byUserId.set(cursor.userId, cursor);
  }

  for (const change of event.changes) {
    switch (change.kind) {
      case 'joined':
      case 'updated': {
        if (change.origin === 'local') {
          break;
        }
        if (!change.presence.isFor(workspaceId)) {
          break;
        }
        if (change.presence.userId.equals(localUserId)) {
          break;
        }

        const cursor = toRemoteCursor(change.presence);
        if (cursor === null) {
          byUserId.delete(change.presence.userId.value);
          break;
        }

        byUserId.set(cursor.userId, cursor);
        break;
      }
      case 'left':
        byUserId.delete(change.userId.value);
        break;
    }
  }

  return sortCursors([...byUserId.values()]);
}

export function createRemoteCursorsStore(
  presencePort: PresencePort,
  workspaceId: WorkspaceId,
  localUserId: UserId,
): RemoteCursorsStore {
  const listeners = new Set<() => void>();
  let snapshot: RemoteCursorsSnapshot = EMPTY_SNAPSHOT;
  let unsubscribePort: Unsubscribe | null = null;

  function publish(next: RemoteCursorsSnapshot): void {
    if (snapshot.error === next.error && sameCursors(snapshot.cursors, next.cursors)) {
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
        publish({
          cursors: reduceRemoteCursors(snapshot.cursors, event, workspaceId, localUserId),
          error: null,
        });
      },
      (error) => {
        publish({ cursors: snapshot.cursors, error });
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
