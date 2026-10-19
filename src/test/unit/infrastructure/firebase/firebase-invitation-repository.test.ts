import type { Firestore } from 'firebase/firestore';
import { Invitation } from '../../../../domain/invitation';
import { InvitationId, UserId, WorkspaceId } from '../../../../domain/shared';
import { createFirebaseInvitationRepository } from '../../../../infrastructure/firebase/firebase-invitation-repository';
import { ERROR_CODES, isAppError } from '../../../../shared/errors';
import { describeInvitationRepositoryContract } from '../../../contract/invitation-repository-contract';
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

function makeInvitation(
  overrides: Partial<Parameters<typeof Invitation.create>[0]> = {},
): Invitation {
  return Invitation.create({
    id: InvitationId.create('inv-1'),
    workspaceId: WorkspaceId.create('ws-1'),
    email: 'invitee@example.com',
    role: 'editor',
    tokenHash: 'hash-1',
    invitedBy: UserId.create('user-1'),
    expiresAt: new Date('2026-01-08T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}

describe('createFirebaseInvitationRepository', () => {
  beforeEach(() => {
    firestoreMock.__reset();
  });

  describeInvitationRepositoryContract('invitation repository contract', () =>
    createFirebaseInvitationRepository(makeFirestore()),
  );

  it('persists the invitation under its id with Date fields', async () => {
    const repository = createFirebaseInvitationRepository(makeFirestore());
    const invitation = makeInvitation();

    const created = await repository.create(invitation);

    const stored = firestoreMock.__read('invitations/inv-1');
    if (stored === undefined) {
      throw new Error('Expected the document invitations/inv-1 to be persisted');
    }
    expect(stored.id).toBe('inv-1');
    expect(stored.workspaceId).toBe('ws-1');
    expect(stored.email).toBe('invitee@example.com');
    expect(stored.role).toBe('editor');
    expect(stored.tokenHash).toBe('hash-1');
    expect(stored.status).toBe('pending');
    expect(stored.invitedBy).toBe('user-1');
    expect(stored.expiresAt).toEqual(created.expiresAt);
    expect(stored.createdAt).toEqual(created.createdAt);
    expect(stored.updatedAt).toEqual(created.updatedAt);
  });

  it('rejects a duplicate pending email in the same workspace', async () => {
    const repository = createFirebaseInvitationRepository(makeFirestore());
    await repository.create(makeInvitation());

    await expect(
      repository.create(makeInvitation({ id: InvitationId.create('inv-2'), tokenHash: 'hash-2' })),
    ).rejects.toMatchObject({
      kind: 'conflict',
      code: ERROR_CODES.INVITATION_ALREADY_EXISTS,
    });

    expect(firestoreMock.__paths()).toEqual(['invitations/inv-1']);
  });

  it('translates a storage failure from Firestore into a network AppError', async () => {
    const repository = createFirebaseInvitationRepository(makeFirestore());
    firestoreMock.__failNextWith('unavailable');

    const error: unknown = await repository
      .listPendingByWorkspace(WorkspaceId.create('ws-1'))
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
    });
    expect(isAppError(error)).toBe(true);
  });

  it('translates permission-denied from Firestore into an authorization AppError', async () => {
    const repository = createFirebaseInvitationRepository(makeFirestore());
    firestoreMock.__failNextWith('permission-denied');

    const error: unknown = await repository
      .create(makeInvitation())
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      kind: 'authorization',
      code: ERROR_CODES.AUTH_FORBIDDEN,
    });
    expect(isAppError(error)).toBe(true);
    expect(firestoreMock.__paths()).toEqual([]);
  });

  it('updates only the status and updatedAt of the stored document', async () => {
    const repository = createFirebaseInvitationRepository(makeFirestore());
    const created = await repository.create(makeInvitation());

    await repository.updateStatus(InvitationId.create('inv-1'), 'revoked');

    const stored = firestoreMock.__read('invitations/inv-1');
    expect(stored?.status).toBe('revoked');
    expect(stored?.id).toBe('inv-1');
    expect(stored?.tokenHash).toBe('hash-1');
    expect(stored?.createdAt).toEqual(created.createdAt);
    expect(stored?.updatedAt).toBeInstanceOf(Date);
  });

  it('reads back Timestamp-like date fields from stored documents', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    firestoreMock.__seed('invitations/inv-1', {
      id: 'inv-1',
      workspaceId: 'ws-1',
      email: 'invitee@example.com',
      role: 'editor',
      tokenHash: 'hash-1',
      status: 'pending',
      invitedBy: 'user-1',
      expiresAt: { toDate: () => new Date('2026-01-08T00:00:00.000Z') },
      createdAt: { toDate: () => createdAt },
      updatedAt: { toDate: () => createdAt },
    });
    const repository = createFirebaseInvitationRepository(makeFirestore());

    const invitation = await repository.findByTokenHash('hash-1');

    expect(invitation).not.toBeNull();
    expect(invitation?.id.value).toBe('inv-1');
    expect(invitation?.createdAt.getTime()).toBe(createdAt.getTime());
  });

  it('filters findByTokenHash by normalized email when one is provided', async () => {
    const repository = createFirebaseInvitationRepository(makeFirestore());
    await repository.create(makeInvitation());

    const matching = await repository.findByTokenHash('hash-1', '  INVITEE@example.com ');
    const mismatched = await repository.findByTokenHash('hash-1', 'other@example.com');
    const empty = await repository.findByTokenHash('hash-1', '   ');

    expect(matching?.id.value).toBe('inv-1');
    expect(mismatched).toBeNull();
    expect(empty).toBeNull();
  });

  it('rejects listPendingByWorkspace with a validation AppError when a stored document breaks invariants', async () => {
    firestoreMock.__seed('invitations/inv-1', {
      id: 'inv-1',
      workspaceId: 'ws-1',
      email: 42,
      role: 'editor',
      tokenHash: 'hash-1',
      status: 'pending',
      invitedBy: 'user-1',
      expiresAt: new Date('2026-01-08T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const repository = createFirebaseInvitationRepository(makeFirestore());

    const error: unknown = await repository
      .listPendingByWorkspace(WorkspaceId.create('ws-1'))
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      kind: 'validation',
      code: ERROR_CODES.VALIDATION_INVALID_INPUT,
    });
    expect(isAppError(error)).toBe(true);
  });
});
