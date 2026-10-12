import {
  createRemoteCursorsStore,
  reduceRemoteCursors,
  type RemoteCursor,
} from '../../../../application/services/remote-cursors-store';
import type { PresenceEvent } from '../../../../application/ports';
import { Presence } from '../../../../domain/collaboration';
import { Position, UserId, WorkspaceId } from '../../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../../shared/errors';
import { FakePresencePort } from '../../../fixtures/fake-presence-port';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const OTHER_WORKSPACE_ID = WorkspaceId.create('ws-2');
const LOCAL_USER_ID = UserId.create('local-user');

function buildPresence(
  userId: string,
  cursor: Position | null,
  lastSeenAt: string = '2024-01-01T00:00:00.000Z',
  workspaceId: WorkspaceId = WORKSPACE_ID,
): Presence {
  return Presence.create({
    userId: UserId.create(userId),
    workspaceId,
    lastSeenAt: new Date(lastSeenAt),
    cursor,
  });
}

function joinedEvent(
  userId: string,
  cursor: Position | null,
  origin: 'local' | 'remote' = 'remote',
  workspaceId: WorkspaceId = WORKSPACE_ID,
): PresenceEvent {
  return {
    workspaceId,
    changes: [
      { kind: 'joined', presence: buildPresence(userId, cursor, undefined, workspaceId), origin },
    ],
  };
}

function syncError() {
  return createAppError('collaboration', ERROR_CODES.COLLABORATION_SYNC_FAILED, 'Sync failed.');
}

describe('reduceRemoteCursors', () => {
  it('adds a remote joined cursor', () => {
    const next = reduceRemoteCursors(
      [],
      joinedEvent('user-1', Position.create(10, 20)),
      WORKSPACE_ID,
      LOCAL_USER_ID,
    );

    expect(next).toEqual([
      {
        userId: 'user-1',
        position: Position.create(10, 20),
        lastSeenAt: new Date('2024-01-01T00:00:00.000Z'),
      },
    ]);
  });

  it('ignores a local-origin change', () => {
    const next = reduceRemoteCursors(
      [],
      joinedEvent('user-1', Position.create(10, 20), 'local'),
      WORKSPACE_ID,
      LOCAL_USER_ID,
    );

    expect(next).toEqual([]);
  });

  it('ignores the local user cursor', () => {
    const next = reduceRemoteCursors(
      [],
      joinedEvent(LOCAL_USER_ID.value, Position.create(1, 1)),
      WORKSPACE_ID,
      LOCAL_USER_ID,
    );

    expect(next).toEqual([]);
  });

  it('ignores a presence without a cursor', () => {
    const next = reduceRemoteCursors([], joinedEvent('user-1', null), WORKSPACE_ID, LOCAL_USER_ID);

    expect(next).toEqual([]);
  });

  it('ignores events from another workspace without changing the reference', () => {
    const initial: readonly RemoteCursor[] = [
      { userId: 'user-1', position: Position.create(1, 2), lastSeenAt: new Date() },
    ];

    const next = reduceRemoteCursors(
      initial,
      joinedEvent('user-2', Position.create(3, 4), 'remote', OTHER_WORKSPACE_ID),
      WORKSPACE_ID,
      LOCAL_USER_ID,
    );

    expect(next).toBe(initial);
  });

  it('ignores a cursor declared for another workspace inside the event', () => {
    const event: PresenceEvent = {
      workspaceId: WORKSPACE_ID,
      changes: [
        {
          kind: 'joined',
          presence: buildPresence('user-2', Position.create(3, 4), undefined, OTHER_WORKSPACE_ID),
          origin: 'remote',
        },
      ],
    };

    const next = reduceRemoteCursors([], event, WORKSPACE_ID, LOCAL_USER_ID);

    expect(next).toEqual([]);
  });

  it('updates the cursor of an existing remote user', () => {
    const initial: readonly RemoteCursor[] = [
      {
        userId: 'user-1',
        position: Position.create(1, 2),
        lastSeenAt: new Date('2024-01-01T00:00:00.000Z'),
      },
    ];

    const next = reduceRemoteCursors(
      initial,
      {
        workspaceId: WORKSPACE_ID,
        changes: [
          {
            kind: 'updated',
            presence: buildPresence('user-1', Position.create(9, 9), '2024-01-01T00:00:05.000Z'),
            origin: 'remote',
          },
        ],
      },
      WORKSPACE_ID,
      LOCAL_USER_ID,
    );

    expect(next).toEqual([
      {
        userId: 'user-1',
        position: Position.create(9, 9),
        lastSeenAt: new Date('2024-01-01T00:00:05.000Z'),
      },
    ]);
  });

  it('drops a cursor when the remote presence no longer carries one', () => {
    const initial: readonly RemoteCursor[] = [
      {
        userId: 'user-1',
        position: Position.create(1, 2),
        lastSeenAt: new Date('2024-01-01T00:00:00.000Z'),
      },
    ];

    const next = reduceRemoteCursors(
      initial,
      {
        workspaceId: WORKSPACE_ID,
        changes: [
          {
            kind: 'updated',
            presence: buildPresence('user-1', null, '2024-01-01T00:00:05.000Z'),
            origin: 'remote',
          },
        ],
      },
      WORKSPACE_ID,
      LOCAL_USER_ID,
    );

    expect(next).toEqual([]);
  });

  it('removes a cursor when the user leaves', () => {
    const initial: readonly RemoteCursor[] = [
      {
        userId: 'user-1',
        position: Position.create(1, 2),
        lastSeenAt: new Date(),
      },
      {
        userId: 'user-2',
        position: Position.create(3, 4),
        lastSeenAt: new Date(),
      },
    ];

    const next = reduceRemoteCursors(
      initial,
      {
        workspaceId: WORKSPACE_ID,
        changes: [{ kind: 'left', userId: UserId.create('user-1'), origin: 'remote' }],
      },
      WORKSPACE_ID,
      LOCAL_USER_ID,
    );

    expect(next.map((cursor) => cursor.userId)).toEqual(['user-2']);
  });

  it('orders cursors by user id and does not mutate the input', () => {
    const initial: readonly RemoteCursor[] = [
      { userId: 'user-2', position: Position.create(1, 2), lastSeenAt: new Date() },
    ];
    const snapshot = [...initial];

    const next = reduceRemoteCursors(
      initial,
      joinedEvent('user-1', Position.create(5, 6)),
      WORKSPACE_ID,
      LOCAL_USER_ID,
    );

    expect(next.map((cursor) => cursor.userId)).toEqual(['user-1', 'user-2']);
    expect(initial).toEqual(snapshot);
  });
});

describe('createRemoteCursorsStore', () => {
  it('starts empty without error', () => {
    const store = createRemoteCursorsStore(new FakePresencePort(), WORKSPACE_ID, LOCAL_USER_ID);

    expect(store.getSnapshot()).toEqual({ cursors: [], error: null });
  });

  it('does not subscribe to the port until there is a subscriber', () => {
    const port = new FakePresencePort();
    createRemoteCursorsStore(port, WORKSPACE_ID, LOCAL_USER_ID);

    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(0);
  });

  it('opens a single port subscription shared by every subscriber', () => {
    const port = new FakePresencePort();
    const store = createRemoteCursorsStore(port, WORKSPACE_ID, LOCAL_USER_ID);

    const first = store.subscribe(jest.fn());
    const second = store.subscribe(jest.fn());

    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(1);

    first();
    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(1);

    second();
    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(0);
  });

  it('tracks remote cursors and notifies listeners', () => {
    const port = new FakePresencePort();
    const store = createRemoteCursorsStore(port, WORKSPACE_ID, LOCAL_USER_ID);
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    port.emitChanges(WORKSPACE_ID, [
      {
        kind: 'joined',
        presence: buildPresence('user-1', Position.create(1, 2)),
        origin: 'remote',
      },
    ]);
    expect(store.getSnapshot().cursors.map((cursor) => cursor.userId)).toEqual(['user-1']);

    port.emitChanges(WORKSPACE_ID, [
      {
        kind: 'updated',
        presence: buildPresence('user-1', Position.create(9, 9), '2024-01-01T00:00:09.000Z'),
        origin: 'remote',
      },
    ]);
    expect(store.getSnapshot().cursors[0]?.position.equals(Position.create(9, 9))).toBe(true);

    port.emitChanges(WORKSPACE_ID, [
      { kind: 'left', userId: UserId.create('user-1'), origin: 'remote' },
    ]);
    expect(store.getSnapshot().cursors).toEqual([]);

    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
  });

  it('does not notify nor change the snapshot when nothing changes', () => {
    const port = new FakePresencePort();
    const store = createRemoteCursorsStore(port, WORKSPACE_ID, LOCAL_USER_ID);
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    port.emitChanges(WORKSPACE_ID, [
      { kind: 'left', userId: UserId.create('unknown'), origin: 'remote' },
    ]);
    const before = store.getSnapshot();
    port.emitChanges(WORKSPACE_ID, []);

    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(before);

    unsubscribe();
  });

  it('exposes the port error keeping cursors and clears it on the next change', () => {
    const port = new FakePresencePort();
    const store = createRemoteCursorsStore(port, WORKSPACE_ID, LOCAL_USER_ID);
    const unsubscribe = store.subscribe(jest.fn());

    port.emitChanges(WORKSPACE_ID, [
      {
        kind: 'joined',
        presence: buildPresence('user-1', Position.create(1, 2)),
        origin: 'remote',
      },
    ]);

    const error = syncError();
    port.emitError(WORKSPACE_ID, error);
    expect(store.getSnapshot().error).toBe(error);
    expect(store.getSnapshot().cursors.map((cursor) => cursor.userId)).toEqual(['user-1']);

    port.emitChanges(WORKSPACE_ID, [
      {
        kind: 'joined',
        presence: buildPresence('user-2', Position.create(3, 4)),
        origin: 'remote',
      },
    ]);
    expect(store.getSnapshot().error).toBeNull();
    expect(store.getSnapshot().cursors.map((cursor) => cursor.userId)).toEqual([
      'user-1',
      'user-2',
    ]);

    unsubscribe();
  });

  it('releases the port subscription when the last subscriber leaves and reconnects after', () => {
    const port = new FakePresencePort();
    const store = createRemoteCursorsStore(port, WORKSPACE_ID, LOCAL_USER_ID);

    const unsubscribe = store.subscribe(jest.fn());
    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(1);

    unsubscribe();
    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(0);

    const resubscribe = store.subscribe(jest.fn());
    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(1);

    resubscribe();
  });

  it('treats unsubscribe as idempotent', () => {
    const port = new FakePresencePort();
    const store = createRemoteCursorsStore(port, WORKSPACE_ID, LOCAL_USER_ID);

    const unsubscribe = store.subscribe(jest.fn());
    unsubscribe();

    expect(() => unsubscribe()).not.toThrow();
    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(0);
  });
});
