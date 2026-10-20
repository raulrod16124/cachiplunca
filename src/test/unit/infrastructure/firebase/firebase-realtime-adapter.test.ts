import type { Firestore } from 'firebase/firestore';
import type { ElementRealtimeChange, ElementRealtimeEvent } from '../../../../application/ports';
import {
  createConnectorElement,
  createFrameElement,
  createImageElement,
  createLinkElement,
  createNoteElement,
  createTaskElement,
  createTextElement,
  type Element,
} from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { createFirebaseRealtimeAdapter } from '../../../../infrastructure/firebase/firebase-realtime-adapter';
import { toElementDocument } from '../../../../infrastructure/firebase/firebase-element-mapper';
import { ERROR_CODES, isAppError } from '../../../../shared/errors';
import {
  describeRealtimePortContract,
  type RealtimePortHarness,
} from '../../../contract/realtime-port-contract';
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
const USER_ID = UserId.create('user-1');
const CREATED_AT = new Date('2024-01-01T00:00:00.000Z');
const UPDATED_AT = new Date('2024-01-02T00:00:00.000Z');

function makeFirestore(): Firestore {
  return {} as unknown as Firestore;
}

function baseProps(workspaceId: WorkspaceId = WORKSPACE_ID) {
  return {
    workspaceId,
    createdBy: USER_ID,
    position: Position.create(10, 20),
    size: Size.create(120, 80),
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  };
}

function buildTextElement(id: string, workspaceId: WorkspaceId = WORKSPACE_ID): Element {
  return createTextElement({
    ...baseProps(workspaceId),
    id: ElementId.create(id),
    content: 'Hello',
  });
}

function toSnapshotInputs(changes: readonly ElementRealtimeChange[]): MockRealtimeChangeInput[] {
  return changes.map((change) => {
    if (change.kind === 'removed') {
      return { type: 'removed', id: change.elementId.value };
    }
    return {
      type: change.kind,
      id: change.element.id.value,
      data: toElementDocument(change.element),
    };
  });
}

function createHarness(): RealtimePortHarness {
  const port = createFirebaseRealtimeAdapter(makeFirestore());
  return {
    port,
    emit(event: ElementRealtimeEvent) {
      firestoreMock.__emitSnapshot(event.workspaceId.value, toSnapshotInputs(event.changes));
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

function firstEvent(listener: jest.Mock): ElementRealtimeEvent {
  return listener.mock.calls[0]?.[0] as ElementRealtimeEvent;
}

describe('createFirebaseRealtimeAdapter', () => {
  beforeEach(() => {
    firestoreMock.__reset();
  });

  describeRealtimePortContract('Firebase realtime adapter contract', createHarness);

  it('discards the initial snapshot (subsequent-only)', () => {
    firestoreMock.__seed('elements/existing', toElementDocument(buildTextElement('existing')));
    const port = createFirebaseRealtimeAdapter(makeFirestore());
    const listener = jest.fn();

    port.subscribe(WORKSPACE_ID, listener);

    expect(listener).not.toHaveBeenCalled();
  });

  it('emits only changes from snapshots received after the first one', () => {
    const port = createFirebaseRealtimeAdapter(makeFirestore());
    const listener = jest.fn();
    port.subscribe(WORKSPACE_ID, listener);

    firestoreMock.__emitSnapshot('ws-1', [
      {
        type: 'added',
        id: 'el-1',
        data: toElementDocument(buildTextElement('el-1')),
      },
    ]);

    expect(listener).toHaveBeenCalledTimes(1);
    const event = firstEvent(listener);
    expect(event.workspaceId.value).toBe('ws-1');
    expect(event.changes).toHaveLength(1);
    expect(event.changes[0]).toMatchObject({ kind: 'added' });
  });

  it('marks local writes as origin "local" and confirmed writes as "remote"', () => {
    const port = createFirebaseRealtimeAdapter(makeFirestore());
    const listener = jest.fn();
    port.subscribe(WORKSPACE_ID, listener);
    const document = toElementDocument(buildTextElement('el-1'));

    firestoreMock.__emitSnapshot('ws-1', [
      { type: 'added', id: 'el-1', data: document, hasPendingWrites: true },
    ]);
    firestoreMock.__emitSnapshot('ws-1', [
      { type: 'modified', id: 'el-1', data: document, hasPendingWrites: false },
    ]);

    expect(firstEvent(listener).changes[0]?.origin).toBe('local');
    const secondEvent = listener.mock.calls[1]?.[0] as ElementRealtimeEvent;
    expect(secondEvent.changes[0]?.origin).toBe('remote');
  });

  it('maps removed changes to a removed change carrying the element id', () => {
    const port = createFirebaseRealtimeAdapter(makeFirestore());
    const listener = jest.fn();
    port.subscribe(WORKSPACE_ID, listener);

    firestoreMock.__emitSnapshot('ws-1', [{ type: 'removed', id: 'el-1' }]);

    const change = firstEvent(listener).changes[0];
    expect(change).toMatchObject({ kind: 'removed' });
    if (change?.kind !== 'removed') {
      throw new Error('Expected a removed change');
    }
    expect(change.elementId.value).toBe('el-1');
  });

  it('round-trips every MVP element type from the stored document', () => {
    const port = createFirebaseRealtimeAdapter(makeFirestore());
    const listener = jest.fn();
    port.subscribe(WORKSPACE_ID, listener);

    const elements: Element[] = [
      buildTextElement('text-1'),
      createNoteElement({ ...baseProps(), id: ElementId.create('note-1'), content: 'Note' }),
      createTaskElement({
        ...baseProps(),
        id: ElementId.create('task-1'),
        title: 'Task',
        status: 'in_progress',
      }),
      createFrameElement({ ...baseProps(), id: ElementId.create('frame-1'), title: 'Frame' }),
      createConnectorElement({
        ...baseProps(),
        id: ElementId.create('conn-1'),
        sourceElementId: ElementId.create('source'),
        targetElementId: ElementId.create('target'),
      }),
      createLinkElement({
        ...baseProps(),
        id: ElementId.create('link-1'),
        url: 'https://example.com',
      }),
      createImageElement({
        ...baseProps(),
        id: ElementId.create('image-1'),
        src: 'https://example.com/image.png',
        alt: 'Example',
      }),
    ];

    firestoreMock.__emitSnapshot(
      'ws-1',
      elements.map((element) => ({
        type: 'added' as const,
        id: element.id.value,
        data: toElementDocument(element),
      })),
    );

    const event = firstEvent(listener);
    expect(
      event.changes.map((change) => (change.kind === 'removed' ? 'removed' : change.element.type)),
    ).toEqual(['text', 'note', 'task', 'frame', 'connector', 'link', 'image']);
  });

  it('reports a corrupt document through onError without notifying the listener', () => {
    const port = createFirebaseRealtimeAdapter(makeFirestore());
    const listener = jest.fn();
    const onError = jest.fn();
    port.subscribe(WORKSPACE_ID, listener, onError);

    firestoreMock.__emitSnapshot('ws-1', [
      {
        type: 'added',
        id: 'corrupt',
        data: {
          type: 'text',
          workspaceId: 'ws-1',
          position: { x: 0, y: 0 },
          size: { width: 10, height: 10 },
          rotation: 0,
          createdBy: 'user-1',
          createdAt: CREATED_AT,
          updatedAt: UPDATED_AT,
        },
      },
    ]);

    expect(listener).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toMatchObject({
      kind: 'collaboration',
      code: ERROR_CODES.COLLABORATION_SYNC_FAILED,
    });
    expect(isAppError(onError.mock.calls[0]?.[0])).toBe(true);
  });

  it('translates a Firestore stream error into a collaboration AppError', () => {
    const port = createFirebaseRealtimeAdapter(makeFirestore());
    const onError = jest.fn();
    port.subscribe(WORKSPACE_ID, jest.fn(), onError);

    firestoreMock.__emitError('ws-1', Object.assign(new Error('Down'), { code: 'unavailable' }));

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toMatchObject({
      kind: 'collaboration',
      code: ERROR_CODES.COLLABORATION_SYNC_FAILED,
    });
  });

  it('does not throw when a stream error arrives without an onError listener', () => {
    const port = createFirebaseRealtimeAdapter(makeFirestore());
    port.subscribe(WORKSPACE_ID, jest.fn());

    expect(() => firestoreMock.__emitError('ws-1', new Error('Down'))).not.toThrow();
  });

  it('reports reconnecting while Firestore serves snapshots from cache', () => {
    const port = createFirebaseRealtimeAdapter(makeFirestore());
    const onConnectionChange = jest.fn();
    port.subscribe(WORKSPACE_ID, jest.fn(), undefined, onConnectionChange);

    firestoreMock.__emitSnapshot('ws-1', [], { fromCache: true });

    expect(onConnectionChange).toHaveBeenCalledTimes(1);
    expect(onConnectionChange).toHaveBeenCalledWith('reconnecting');
  });

  it('reports connected once the server snapshot arrives after a cache snapshot', () => {
    const port = createFirebaseRealtimeAdapter(makeFirestore());
    const onConnectionChange = jest.fn();
    port.subscribe(WORKSPACE_ID, jest.fn(), undefined, onConnectionChange);

    firestoreMock.__emitSnapshot('ws-1', [], { fromCache: true });
    firestoreMock.__emitSnapshot('ws-1', [], { fromCache: false });

    expect(onConnectionChange).toHaveBeenNthCalledWith(1, 'reconnecting');
    expect(onConnectionChange).toHaveBeenNthCalledWith(2, 'connected');
  });

  it('does not repeat the connection status when it does not change', () => {
    const port = createFirebaseRealtimeAdapter(makeFirestore());
    const onConnectionChange = jest.fn();
    port.subscribe(WORKSPACE_ID, jest.fn(), undefined, onConnectionChange);

    firestoreMock.__emitSnapshot('ws-1', [], { fromCache: true });
    firestoreMock.__emitSnapshot('ws-1', [], { fromCache: true });

    expect(onConnectionChange).toHaveBeenCalledTimes(1);
  });

  it('reports reconnecting from a cache-backed initial snapshot', () => {
    const port = createFirebaseRealtimeAdapter(makeFirestore());
    const onConnectionChange = jest.fn();
    firestoreMock.__setInitialSnapshotFromCache(true);

    port.subscribe(WORKSPACE_ID, jest.fn(), undefined, onConnectionChange);

    expect(onConnectionChange).toHaveBeenCalledTimes(1);
    expect(onConnectionChange).toHaveBeenCalledWith('reconnecting');
  });

  it('reports reconnecting when the stream errors', () => {
    const port = createFirebaseRealtimeAdapter(makeFirestore());
    const onConnectionChange = jest.fn();
    port.subscribe(WORKSPACE_ID, jest.fn(), undefined, onConnectionChange);

    firestoreMock.__emitError('ws-1', Object.assign(new Error('Down'), { code: 'unavailable' }));

    expect(onConnectionChange).toHaveBeenCalledWith('reconnecting');
  });

  it('creates exactly one snapshot listener per subscribe and none after unsubscribe', () => {
    const port = createFirebaseRealtimeAdapter(makeFirestore());
    const unsubscribe = port.subscribe(WORKSPACE_ID, jest.fn());

    expect(firestoreMock.__activeSnapshotListenerCount('ws-1')).toBe(1);

    unsubscribe();
    expect(firestoreMock.__activeSnapshotListenerCount('ws-1')).toBe(0);
  });

  it('treats unsubscribe as idempotent', () => {
    const port = createFirebaseRealtimeAdapter(makeFirestore());
    const unsubscribe = port.subscribe(WORKSPACE_ID, jest.fn());

    unsubscribe();
    expect(() => unsubscribe()).not.toThrow();
    expect(firestoreMock.__activeSnapshotListenerCount('ws-1')).toBe(0);
  });

  it('requests metadata changes from Firestore', () => {
    const port = createFirebaseRealtimeAdapter(makeFirestore());
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
});
