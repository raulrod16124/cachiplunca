import type { Firestore } from 'firebase/firestore';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { createFirebaseMembershipRepository } from '../../../../infrastructure/firebase/firebase-membership-repository';
import { ERROR_CODES, isAppError } from '../../../../shared/errors';
import { describeMembershipRepositoryContract } from '../../../contract/membership-repository-contract';
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

describe('createFirebaseMembershipRepository', () => {
  beforeEach(() => {
    firestoreMock.__reset();
  });

  describeMembershipRepositoryContract('membership repository contract', () =>
    createFirebaseMembershipRepository(makeFirestore()),
  );

  it('persists the membership under a deterministic workspace_user document id', async () => {
    const repository = createFirebaseMembershipRepository(makeFirestore());

    const created = await repository.create({
      userId: UserId.create('user-1'),
      workspaceId: WorkspaceId.create('ws-1'),
      role: 'owner',
    });

    const stored = firestoreMock.__read('memberships/ws-1_user-1');
    if (stored === undefined) {
      throw new Error('Expected the document memberships/ws-1_user-1 to be persisted');
    }
    expect(stored.userId).toBe('user-1');
    expect(stored.workspaceId).toBe('ws-1');
    expect(stored.role).toBe('owner');
    expect(stored.createdAt).toBeInstanceOf(Date);
    expect(stored.updatedAt).toBeInstanceOf(Date);
    expect(stored.createdAt).toEqual(created.createdAt);
    expect(stored.updatedAt).toEqual(created.updatedAt);
  });

  it('does not write any document when the role is invalid', async () => {
    const repository = createFirebaseMembershipRepository(makeFirestore());

    await expect(
      repository.create({
        userId: UserId.create('user-1'),
        workspaceId: WorkspaceId.create('ws-1'),
        role: 'admin' as never,
      }),
    ).rejects.toMatchObject({
      kind: 'validation',
      code: ERROR_CODES.VALIDATION_INVALID_INPUT,
    });

    expect(firestoreMock.__paths()).toEqual([]);
  });

  it('translates a storage failure from Firestore into a network AppError', async () => {
    const repository = createFirebaseMembershipRepository(makeFirestore());
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
    const repository = createFirebaseMembershipRepository(makeFirestore());
    firestoreMock.__failNextWith('permission-denied');

    const error: unknown = await repository
      .create({
        userId: UserId.create('user-1'),
        workspaceId: WorkspaceId.create('ws-1'),
        role: 'owner',
      })
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      kind: 'authorization',
      code: ERROR_CODES.AUTH_FORBIDDEN,
    });
    expect(isAppError(error)).toBe(true);
    expect(firestoreMock.__paths()).toEqual([]);
  });

  it('updates only the role and updatedAt of the stored document', async () => {
    const repository = createFirebaseMembershipRepository(makeFirestore());
    const userId = UserId.create('user-1');
    const workspaceId = WorkspaceId.create('ws-1');
    const created = await repository.create({ userId, workspaceId, role: 'viewer' });

    await repository.updateRole(userId, workspaceId, 'editor');

    const stored = firestoreMock.__read('memberships/ws-1_user-1');
    expect(stored?.role).toBe('editor');
    expect(stored?.userId).toBe('user-1');
    expect(stored?.workspaceId).toBe('ws-1');
    expect(stored?.createdAt).toEqual(created.createdAt);
    expect(stored?.updatedAt).toBeInstanceOf(Date);
  });

  it('reads back Timestamp-like date fields from stored documents', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    firestoreMock.__seed('memberships/ws-1_user-1', {
      userId: 'user-1',
      workspaceId: 'ws-1',
      role: 'editor',
      createdAt: { toDate: () => createdAt },
      updatedAt: { toDate: () => createdAt },
    });
    const repository = createFirebaseMembershipRepository(makeFirestore());

    const membership = await repository.findByUserAndWorkspace(
      UserId.create('user-1'),
      WorkspaceId.create('ws-1'),
    );

    expect(membership).not.toBeNull();
    expect(membership?.role).toBe('editor');
    expect(membership?.createdAt.getTime()).toBe(createdAt.getTime());
    expect(membership?.updatedAt.getTime()).toBe(createdAt.getTime());
  });

  it('rejects listByWorkspace with a validation AppError when a stored document breaks invariants', async () => {
    firestoreMock.__seed('memberships/ws-1_user-1', {
      userId: 42,
      workspaceId: 'ws-1',
      role: 'owner',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const repository = createFirebaseMembershipRepository(makeFirestore());

    const error: unknown = await repository
      .listByWorkspace(WorkspaceId.create('ws-1'))
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      kind: 'validation',
      code: ERROR_CODES.VALIDATION_INVALID_INPUT,
    });
    expect(isAppError(error)).toBe(true);
  });
});
