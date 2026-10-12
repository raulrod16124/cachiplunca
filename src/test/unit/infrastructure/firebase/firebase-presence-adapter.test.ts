import type { Firestore } from 'firebase/firestore';
import type { PresenceChange, PresenceEvent } from '../../../../application/ports';
import { Presence } from '../../../../domain/collaboration';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import {
  createFirebasePresenceAdapter,
  presenceDocId,
} from '../../../../infrastructure/firebase/firebase-presence-adapter';
import { toPresenceDocument } from '../../../../infrastructure/firebase/firebase-presence-mapper';
import { ERROR_CODES, isAppError } from '../../../../shared/errors';
import {
  describePresencePortContract,
  type PresencePortHarness,
} from '../../../contract/presence-port-contract';
import type {
  InMemoryFirestoreApi,
  MockRealtimeChangeInput,
} from '../../../fixtures/in-memory-firestore';

jest.mock('firebase/firestore', () =>
  jest
    .requireActual<typeof import('../../../fixtures/in-memory-firestore')>(
      '../../../fixtures/in-memory-firestore',
    )
    .createInMemoryFirestoreModule(),
);

const firestoreMock: InMemoryFirestoreApi = jest.requireMock('firebase/firestore');

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const OTHER_WORKSPACE_ID = WorkspaceId.create('ws-2');
const USER_ID = UserId.create('user-1');
const LAST_SEEN_AT = new Date('2024-01-02T00:00:00.000Z');

function makeFirestore(): Firestore {
  return {} as unknown as Firestore;
}

function buildPresence(
  userId: string = USER_ID.value,
  workspaceId: WorkspaceId = WORKSPACE_ID,
  lastSeenAt: Date = LAST_SEEN_AT,
): Presence {
  return Presence.create({ userId: UserId.create(userId), workspaceId, lastSeenAt });
}

function toSnapshotInputs(
  workspaceId: WorkspaceId,
  changes: readonly PresenceChange[],
): MockRealtimeChangeInput[] {
  return changes.map((change) => {
    if (change.kind === 'left') {
      return {
        type: 'removed',
        id: presenceDocId(workspaceId.value, change.userId.value),
      };
    }
    return {
      type: change.kind === 'joined' ? 'added' : 'modified',
      id: presenceDocId(workspaceId.value, change.presence.userId.value),
      data: toPresenceDocument(change.presence),
    };
  });
}

function createHarness(): PresencePortHarness {
  const port = createFirebasePresenceAdapter(makeFirestore());
  return {
    port,
    emit(event: PresenceEvent) {
      firestoreMock.__emitSnapshot(
        event.workspaceId.value,
        toSnapshotInputs(event.workspaceId, event.changes),
      );
    },
    emitError(workspaceId: WorkspaceId, error) {
      firestoreMock.__emitError(workspaceId.value, error);
    },
    emitConnectionChange(workspaceId: WorkspaceId, status) {
      firestoreMock.__emitSnapshot(workspaceId.value, [], {
        fromCache: status === 'reconnecting',
      });
    },
    activeSubscriptionCount(workspaceId?: WorkspaceId) {
      return firestoreMock.__activeSnapshotListenerCount(workspaceId?.value);
    },
  };
}

function firstEvent(listener: jest.Mock): PresenceEvent {
  return listener.mock.calls[0]?.[0] as PresenceEvent;
}

describe('createFirebasePresenceAdapter', () => {
  beforeEach(() => {
    firestoreMock.__reset();
  });

  describePresencePortContract('Firebase presence adapter contract', createHarness);

  it('discards the initial snapshot (subsequent-only)', () => {
    firestoreMock.__seed(
      `presence/${presenceDocId(WORKSPACE_ID.value, USER_ID.value)}`,
      toPresenceDocument(buildPresence()),
    );
    const port = createFirebasePresenceAdapter(makeFirestore());
    const listener = jest.fn();

    port.subscribe(WORKSPACE_ID, listener);

    expect(listener).not.toHaveBeenCalled();
  });

  it('maps added changes to joined and modified changes to updated', () => {
    const port = createFirebasePresenceAdapter(makeFirestore());
    const listener = jest.fn();
    port.subscribe(WORKSPACE_ID, listener);

    firestoreMock.__emitSnapshot('ws-1', [
      {
        type: 'added',
        id: presenceDocId('ws-1', 'user-1'),
        data: toPresenceDocument(buildPresence()),
      },
    ]);
    firestoreMock.__emitSnapshot('ws-1', [
      {
        type: 'modified',
        id: presenceDocId('ws-1', 'user-1'),
        data: toPresenceDocument(
          buildPresence('user-1', WORKSPACE_ID, new Date('2024-01-03T00:00:00.000Z')),
        ),
      },
    ]);

    expect(firstEvent(listener).changes[0]?.kind).toBe('joined');
    const secondEvent = listener.mock.calls[1]?.[0] as PresenceEvent;
    expect(secondEvent.changes[0]?.kind).toBe('updated');
  });

  it('marks local writes as origin "local" and confirmed writes as "remote"', () => {
    const port = createFirebasePresenceAdapter(makeFirestore());
    const listener = jest.fn();
    port.subscribe(WORKSPACE_ID, listener);
    const document = toPresenceDocument(buildPresence());

    firestoreMock.__emitSnapshot('ws-1', [
      {
        type: 'added',
        id: presenceDocId('ws-1', 'user-1'),
        data: document,
        hasPendingWrites: true,
      },
    ]);
    firestoreMock.__emitSnapshot('ws-1', [
      {
        type: 'modified',
        id: presenceDocId('ws-1', 'user-1'),
        data: document,
        hasPendingWrites: false,
      },
    ]);

    expect(firstEvent(listener).changes[0]?.origin).toBe('local');
    const secondEvent = listener.mock.calls[1]?.[0] as PresenceEvent;
    expect(secondEvent.changes[0]?.origin).toBe('remote');
  });

  it('maps removed changes to a left change carrying the user id parsed from the doc id', () => {
    const port = createFirebasePresenceAdapter(makeFirestore());
    const listener = jest.fn();
    port.subscribe(WORKSPACE_ID, listener);

    firestoreMock.__emitSnapshot('ws-1', [
      { type: 'removed', id: presenceDocId(WORKSPACE_ID.value, 'user-9') },
    ]);

    const change = firstEvent(listener).changes[0];
    expect(change).toMatchObject({ kind: 'left' });
    if (change?.kind !== 'left') {
      throw new Error('Expected a left change');
    }
    expect(change.userId.value).toBe('user-9');
  });

  it('announces the local presence by writing its document', async () => {
    const port = createFirebasePresenceAdapter(makeFirestore());

    await port.announce(buildPresence());

    expect(firestoreMock.__read(`presence/${presenceDocId('ws-1', 'user-1')}`)).toEqual({
      workspaceId: 'ws-1',
      userId: 'user-1',
      lastSeenAt: LAST_SEEN_AT,
    });
  });

  it('keeps presence completely separate from the persisted elements document', async () => {
    firestoreMock.__seed('elements/el-1', { workspaceId: 'ws-1' });
    const port = createFirebasePresenceAdapter(makeFirestore());

    await port.announce(buildPresence());
    await port.withdraw(WORKSPACE_ID, USER_ID);

    expect(firestoreMock.__paths()).toEqual(['elements/el-1']);
  });

  it('translates a failed announce into a mapped AppError', async () => {
    const port = createFirebasePresenceAdapter(makeFirestore());
    firestoreMock.__failNextWith('unavailable');

    await expect(port.announce(buildPresence())).rejects.toMatchObject({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
    });
  });

  it('withdraws the local presence by deleting its document', async () => {
    firestoreMock.__seed(
      `presence/${presenceDocId('ws-1', 'user-1')}`,
      toPresenceDocument(buildPresence()),
    );
    const port = createFirebasePresenceAdapter(makeFirestore());

    await port.withdraw(WORKSPACE_ID, USER_ID);

    expect(firestoreMock.__read(`presence/${presenceDocId('ws-1', 'user-1')}`)).toBeUndefined();
  });

  it('treats withdrawing an absent presence as a no-op', async () => {
    const port = createFirebasePresenceAdapter(makeFirestore());

    await expect(port.withdraw(WORKSPACE_ID, USER_ID)).resolves.toBeUndefined();
  });

  it('reports a corrupt presence document through onError without notifying the listener', () => {
    const port = createFirebasePresenceAdapter(makeFirestore());
    const listener = jest.fn();
    const onError = jest.fn();
    port.subscribe(WORKSPACE_ID, listener, onError);

    firestoreMock.__emitSnapshot('ws-1', [
      { type: 'added', id: presenceDocId('ws-1', 'user-1'), data: { userId: 'user-1' } },
    ]);

    expect(listener).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toMatchObject({
      kind: 'collaboration',
      code: ERROR_CODES.COLLABORATION_SYNC_FAILED,
    });
    expect(isAppError(onError.mock.calls[0]?.[0])).toBe(true);
  });

  it('requests metadata changes from Firestore', () => {
    const port = createFirebasePresenceAdapter(makeFirestore());
    const spy = jest.spyOn(firestoreMock, 'onSnapshot');

    port.subscribe(WORKSPACE_ID, jest.fn());

    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      { includeMetadataChanges: true },
      expect.any(Function),
      expect.any(Function),
    );

    spy.mockRestore();
  });

  it('creates exactly one snapshot listener per subscribe and none after unsubscribe', () => {
    const port = createFirebasePresenceAdapter(makeFirestore());
    const unsubscribe = port.subscribe(WORKSPACE_ID, jest.fn());

    expect(firestoreMock.__activeSnapshotListenerCount('ws-1')).toBe(1);

    unsubscribe();
    expect(firestoreMock.__activeSnapshotListenerCount('ws-1')).toBe(0);
  });

  it('only subscribes to the requested workspace', () => {
    const port = createFirebasePresenceAdapter(makeFirestore());
    const listener = jest.fn();
    port.subscribe(WORKSPACE_ID, listener);

    firestoreMock.__emitSnapshot('ws-2', [
      {
        type: 'added',
        id: presenceDocId('ws-2', 'user-2'),
        data: toPresenceDocument(buildPresence('user-2', OTHER_WORKSPACE_ID)),
      },
    ]);

    expect(listener).not.toHaveBeenCalled();
  });
});
