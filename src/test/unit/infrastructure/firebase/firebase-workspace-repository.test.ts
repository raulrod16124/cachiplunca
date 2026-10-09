import type { Firestore } from 'firebase/firestore';
import { createFirebaseWorkspaceRepository } from '../../../../infrastructure/firebase/firebase-workspace-repository';
import { WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES, isAppError } from '../../../../shared/errors';
import { describeWorkspaceRepositoryContract } from '../../../contract/workspace-repository-contract';
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

describe('createFirebaseWorkspaceRepository', () => {
  beforeEach(() => {
    firestoreMock.__reset();
  });

  describeWorkspaceRepositoryContract('workspace repository contract', () =>
    createFirebaseWorkspaceRepository(makeFirestore()),
  );

  it('persists the workspace document under its generated id with Date timestamps', async () => {
    const repository = createFirebaseWorkspaceRepository(makeFirestore());

    const created = await repository.create({ name: 'Persisted', description: 'notes' });

    const stored = firestoreMock.__read(`workspaces/${created.id.value}`);
    if (stored === undefined) {
      throw new Error(`Expected the document workspaces/${created.id.value} to be persisted`);
    }
    expect(stored.name).toBe('Persisted');
    expect(stored.description).toBe('notes');
    expect(stored.createdAt).toBeInstanceOf(Date);
    expect(stored.updatedAt).toBeInstanceOf(Date);
    expect(stored.createdAt).toEqual(created.createdAt);
    expect(stored.updatedAt).toEqual(created.updatedAt);
  });

  it('does not write any document when input validation fails', async () => {
    const repository = createFirebaseWorkspaceRepository(makeFirestore());

    await expect(repository.create({ name: '   ' })).rejects.toMatchObject({
      kind: 'validation',
    });

    expect(firestoreMock.__paths()).toEqual([]);
  });

  it('translates a storage failure from Firestore into a network AppError', async () => {
    const repository = createFirebaseWorkspaceRepository(makeFirestore());
    firestoreMock.__failNextWith('unavailable');

    const error: unknown = await repository.list().catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
    });
    expect(isAppError(error)).toBe(true);
  });

  it('translates permission-denied from Firestore into an authorization AppError', async () => {
    const repository = createFirebaseWorkspaceRepository(makeFirestore());
    firestoreMock.__failNextWith('permission-denied');

    const error: unknown = await repository.create({ name: 'Blocked' }).catch((r: unknown) => r);

    expect(error).toMatchObject({
      kind: 'authorization',
      code: ERROR_CODES.AUTH_FORBIDDEN,
    });
    expect(isAppError(error)).toBe(true);
    expect(firestoreMock.__paths()).toEqual([]);
  });

  it('updates only the changed fields of the stored document', async () => {
    const repository = createFirebaseWorkspaceRepository(makeFirestore());
    const created = await repository.create({ name: 'Keeper', description: 'keep me' });

    await repository.update(created.id, { name: 'Renamed' });

    const stored = firestoreMock.__read(`workspaces/${created.id.value}`);
    expect(stored?.name).toBe('Renamed');
    expect(stored?.description).toBe('keep me');
    expect(stored?.updatedAt).toBeInstanceOf(Date);
  });

  it('rejects list with a validation AppError when a stored document breaks domain invariants', async () => {
    firestoreMock.__seed('workspaces/corrupt', {
      name: 42,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const repository = createFirebaseWorkspaceRepository(makeFirestore());

    const error: unknown = await repository.list().catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      kind: 'validation',
      code: ERROR_CODES.VALIDATION_INVALID_INPUT,
    });
    expect(isAppError(error)).toBe(true);
  });

  it('reads back Timestamp-like date fields from stored documents', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    firestoreMock.__seed('workspaces/seeded', {
      name: 'Seeded',
      description: null,
      createdAt: { toDate: () => createdAt },
      updatedAt: { toDate: () => createdAt },
    });
    const repository = createFirebaseWorkspaceRepository(makeFirestore());

    const workspace = await repository.findById(WorkspaceId.create('seeded'));

    expect(workspace).not.toBeNull();
    expect(workspace?.name).toBe('Seeded');
    expect(workspace?.createdAt.getTime()).toBe(createdAt.getTime());
    expect(workspace?.updatedAt.getTime()).toBe(createdAt.getTime());
  });
});
