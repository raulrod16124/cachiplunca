import {
  createConnectedUsersStore,
  reduceConnectedUsers,
} from '../../../../application/services/connected-users-store';
import type { PresenceEvent } from '../../../../application/ports';
import { Presence } from '../../../../domain/collaboration';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../../shared/errors';
import { FakePresencePort } from '../../../fixtures/fake-presence-port';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const OTHER_WORKSPACE_ID = WorkspaceId.create('ws-2');

function buildPresence(
  userId: string,
  lastSeenAt: string = '2024-01-01T00:00:00.000Z',
  workspaceId: WorkspaceId = WORKSPACE_ID,
): Presence {
  return Presence.create({
    userId: UserId.create(userId),
    workspaceId,
    lastSeenAt: new Date(lastSeenAt),
  });
}

function joinedEvent(userId: string, workspaceId: WorkspaceId = WORKSPACE_ID): PresenceEvent {
  return {
    workspaceId,
    changes: [
      { kind: 'joined', presence: buildPresence(userId, undefined, workspaceId), origin: 'remote' },
    ],
  };
}

function syncError() {
  return createAppError('collaboration', ERROR_CODES.COLLABORATION_SYNC_FAILED, 'Sync failed.');
}

describe('reduceConnectedUsers', () => {
  it('adds a joined presence', () => {
    const next = reduceConnectedUsers([], joinedEvent('user-1'), WORKSPACE_ID);

    expect(next.map((user) => user.userId.value)).toEqual(['user-1']);
  });

  it('replaces the presence of a user on updated', () => {
    const initial = [buildPresence('user-1')];
    const newer = buildPresence('user-1', '2024-01-01T00:00:05.000Z');

    const next = reduceConnectedUsers(
      initial,
      {
        workspaceId: WORKSPACE_ID,
        changes: [{ kind: 'updated', presence: newer, origin: 'remote' }],
      },
      WORKSPACE_ID,
    );

    expect(next).toEqual([newer]);
  });

  it('removes a user on left', () => {
    const initial = [buildPresence('user-1'), buildPresence('user-2')];

    const next = reduceConnectedUsers(
      initial,
      {
        workspaceId: WORKSPACE_ID,
        changes: [{ kind: 'left', userId: UserId.create('user-1'), origin: 'remote' }],
      },
      WORKSPACE_ID,
    );

    expect(next.map((user) => user.userId.value)).toEqual(['user-2']);
  });

  it('ignores events from another workspace without changing the reference', () => {
    const initial = [buildPresence('user-1')];

    const next = reduceConnectedUsers(
      initial,
      joinedEvent('user-2', OTHER_WORKSPACE_ID),
      WORKSPACE_ID,
    );

    expect(next).toBe(initial);
  });

  it('ignores a joined presence declared for another workspace', () => {
    const initial = [buildPresence('user-1')];

    const next = reduceConnectedUsers(
      initial,
      {
        workspaceId: WORKSPACE_ID,
        changes: [
          {
            kind: 'joined',
            presence: buildPresence('user-2', undefined, OTHER_WORKSPACE_ID),
            origin: 'remote',
          },
        ],
      },
      WORKSPACE_ID,
    );

    expect(next.map((user) => user.userId.value)).toEqual(['user-1']);
  });

  it('orders connected users by user id and does not mutate the input', () => {
    const initial = [buildPresence('user-2')];
    const snapshot = [...initial];

    const next = reduceConnectedUsers(initial, joinedEvent('user-1'), WORKSPACE_ID);

    expect(next.map((user) => user.userId.value)).toEqual(['user-1', 'user-2']);
    expect(initial).toEqual(snapshot);
  });
});

describe('createConnectedUsersStore', () => {
  it('starts empty without error', () => {
    const store = createConnectedUsersStore(new FakePresencePort(), WORKSPACE_ID);

    expect(store.getSnapshot()).toEqual({ users: [], error: null });
  });

  it('does not subscribe to the port until there is a subscriber', () => {
    const port = new FakePresencePort();
    createConnectedUsersStore(port, WORKSPACE_ID);

    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(0);
  });

  it('opens a single port subscription shared by every subscriber', () => {
    const port = new FakePresencePort();
    const store = createConnectedUsersStore(port, WORKSPACE_ID);

    const first = store.subscribe(jest.fn());
    const second = store.subscribe(jest.fn());

    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(1);

    first();
    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(1);

    second();
    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(0);
  });

  it('tracks joined, updated and left changes and notifies listeners', () => {
    const port = new FakePresencePort();
    const store = createConnectedUsersStore(port, WORKSPACE_ID);
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    port.emitChanges(WORKSPACE_ID, [
      { kind: 'joined', presence: buildPresence('user-1'), origin: 'remote' },
    ]);
    expect(store.getSnapshot().users.map((user) => user.userId.value)).toEqual(['user-1']);

    port.emitChanges(WORKSPACE_ID, [
      {
        kind: 'updated',
        presence: buildPresence('user-1', '2024-01-01T00:00:09.000Z'),
        origin: 'remote',
      },
      { kind: 'joined', presence: buildPresence('user-2'), origin: 'remote' },
    ]);
    expect(store.getSnapshot().users.map((user) => user.userId.value)).toEqual([
      'user-1',
      'user-2',
    ]);

    port.emitChanges(WORKSPACE_ID, [
      { kind: 'left', userId: UserId.create('user-1'), origin: 'remote' },
    ]);
    expect(store.getSnapshot().users.map((user) => user.userId.value)).toEqual(['user-2']);

    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
  });

  it('does not notify nor change the snapshot when nothing changes', () => {
    const port = new FakePresencePort();
    const store = createConnectedUsersStore(port, WORKSPACE_ID);
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

  it('exposes the port error keeping users and clears it on the next change', () => {
    const port = new FakePresencePort();
    const store = createConnectedUsersStore(port, WORKSPACE_ID);
    const unsubscribe = store.subscribe(jest.fn());

    port.emitChanges(WORKSPACE_ID, [
      { kind: 'joined', presence: buildPresence('user-1'), origin: 'remote' },
    ]);

    const error = syncError();
    port.emitError(WORKSPACE_ID, error);
    expect(store.getSnapshot().error).toBe(error);
    expect(store.getSnapshot().users.map((user) => user.userId.value)).toEqual(['user-1']);

    port.emitChanges(WORKSPACE_ID, [
      { kind: 'joined', presence: buildPresence('user-2'), origin: 'remote' },
    ]);
    expect(store.getSnapshot().error).toBeNull();
    expect(store.getSnapshot().users.map((user) => user.userId.value)).toEqual([
      'user-1',
      'user-2',
    ]);

    unsubscribe();
  });

  it('releases the port subscription when the last subscriber leaves and reconnects after', () => {
    const port = new FakePresencePort();
    const store = createConnectedUsersStore(port, WORKSPACE_ID);

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
    const store = createConnectedUsersStore(port, WORKSPACE_ID);

    const unsubscribe = store.subscribe(jest.fn());
    unsubscribe();

    expect(() => unsubscribe()).not.toThrow();
    expect(port.activeSubscriptionCount(WORKSPACE_ID)).toBe(0);
  });
});
