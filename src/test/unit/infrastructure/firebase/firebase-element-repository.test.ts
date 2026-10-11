import type { Firestore } from 'firebase/firestore';
import {
  createTextElement,
  isTextElement,
  type Element,
  type TextElement,
} from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { createFirebaseElementRepository } from '../../../../infrastructure/firebase/firebase-element-repository';
import { ERROR_CODES, isAppError } from '../../../../shared/errors';
import { describeElementRepositoryContract } from '../../../contract/element-repository-contract';
import type { InMemoryFirestoreApi } from '../../../fixtures/in-memory-firestore';

jest.mock('firebase/firestore', () =>
  jest
    .requireActual<typeof import('../../../fixtures/in-memory-firestore')>(
      '../../../fixtures/in-memory-firestore',
    )
    .createInMemoryFirestoreModule(),
);

const firestoreMock: InMemoryFirestoreApi = jest.requireMock('firebase/firestore');

function makeFirestore(): Firestore {
  return {} as unknown as Firestore;
}

function buildTextElement(id: string, workspaceId: WorkspaceId, content: string): Element {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId,
    createdBy: UserId.create('user-1'),
    position: Position.create(0, 0),
    size: Size.create(10, 10),
    content,
  });
}

describe('createFirebaseElementRepository', () => {
  beforeEach(() => {
    firestoreMock.__reset();
  });

  describeElementRepositoryContract('element repository contract', () =>
    createFirebaseElementRepository(makeFirestore()),
  );

  it('persists the element document under its id with Date timestamps', async () => {
    const repository = createFirebaseElementRepository(makeFirestore());
    const workspaceId = WorkspaceId.create('ws-1');
    const element = buildTextElement('el-1', workspaceId, 'Persisted');

    const saved = await repository.save(element);

    const stored = firestoreMock.__read(`elements/${saved.id.value}`);
    if (stored === undefined) {
      throw new Error(`Expected the document elements/${saved.id.value} to be persisted`);
    }
    expect(stored.type).toBe('text');
    expect(stored.workspaceId).toBe('ws-1');
    expect(stored.content).toBe('Persisted');
    expect(stored.createdAt).toBeInstanceOf(Date);
    expect(stored.updatedAt).toBeInstanceOf(Date);
    expect(stored.createdAt).toEqual(saved.createdAt);
    expect(stored.updatedAt).toEqual(saved.updatedAt);
  });

  it('does not write any document when input validation fails', async () => {
    const repository = createFirebaseElementRepository(makeFirestore());
    const invalid = {
      ...buildTextElement('el-invalid', WorkspaceId.create('ws-1'), 'Valid'),
      content: undefined,
    } as unknown as Element;

    await expect(repository.save(invalid)).rejects.toMatchObject({
      kind: 'validation',
    });

    expect(firestoreMock.__paths()).toEqual([]);
  });

  it('translates a storage failure from Firestore into a network AppError', async () => {
    const repository = createFirebaseElementRepository(makeFirestore());
    firestoreMock.__failNextWith('unavailable');

    const error: unknown = await repository
      .listByWorkspace(WorkspaceId.create('ws-1'))
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
    });
    expect(isAppError(error)).toBe(true);
  });

  it('translates permission-denied from Firestore into an authorization AppError', async () => {
    const repository = createFirebaseElementRepository(makeFirestore());
    firestoreMock.__failNextWith('permission-denied');

    const error: unknown = await repository
      .save(buildTextElement('el-1', WorkspaceId.create('ws-1'), 'Blocked'))
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      kind: 'authorization',
      code: ERROR_CODES.AUTH_FORBIDDEN,
    });
    expect(isAppError(error)).toBe(true);
    expect(firestoreMock.__paths()).toEqual([]);
  });

  it('reads back Timestamp-like date fields from stored documents', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    firestoreMock.__seed('elements/seeded', {
      type: 'text',
      workspaceId: 'ws-1',
      position: { x: 0, y: 0 },
      size: { width: 10, height: 10 },
      rotation: 0,
      createdBy: 'user-1',
      createdAt: { toDate: () => createdAt },
      updatedAt: { toDate: () => createdAt },
      content: 'Seeded',
    });
    const repository = createFirebaseElementRepository(makeFirestore());

    const element = await repository.findById(ElementId.create('seeded'));

    expect(element).not.toBeNull();
    expect(isTextElement(element as Element)).toBe(true);
    expect((element as TextElement).content).toBe('Seeded');
    expect(element?.createdAt.getTime()).toBe(createdAt.getTime());
    expect(element?.updatedAt.getTime()).toBe(createdAt.getTime());
  });

  it('rejects list with a validation AppError when a stored document breaks domain invariants', async () => {
    firestoreMock.__seed('elements/corrupt', {
      type: 'text',
      workspaceId: 'ws-1',
      position: { x: 0, y: 0 },
      size: { width: 10, height: 10 },
      rotation: 0,
      createdBy: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      content: undefined,
    });
    const repository = createFirebaseElementRepository(makeFirestore());

    const error: unknown = await repository
      .listByWorkspace(WorkspaceId.create('ws-1'))
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      kind: 'validation',
      code: ERROR_CODES.VALIDATION_INVALID_INPUT,
    });
    expect(isAppError(error)).toBe(true);
  });

  it('queries the top-level elements collection by workspaceId', async () => {
    const repository = createFirebaseElementRepository(makeFirestore());
    const firstWorkspace = WorkspaceId.create('ws-1');
    const secondWorkspace = WorkspaceId.create('ws-2');

    await repository.save(buildTextElement('el-here', firstWorkspace, 'Here'));
    await repository.save(buildTextElement('el-there', secondWorkspace, 'There'));

    const listed = await repository.listByWorkspace(firstWorkspace);

    expect(listed).toHaveLength(1);
    expect(isTextElement(listed[0] as Element)).toBe(true);
    expect((listed[0] as TextElement).content).toBe('Here');
  });
});
