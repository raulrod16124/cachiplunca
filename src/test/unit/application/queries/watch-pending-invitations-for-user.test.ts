import {
  createWatchPendingInvitationsForUser,
  type WatchPendingInvitationsForUserErrorListener,
} from '../../../../application/queries';
import type { InvitationRepository } from '../../../../application/ports';
import { Invitation } from '../../../../domain/invitation';
import { InvitationId, UserId, WorkspaceId } from '../../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../../shared/errors';
import { FakeInvitationRepository } from '../../../fixtures/fake-invitation-repository';

const INVITER = UserId.create('user-1');
const CREATED_AT = new Date('2024-01-01T00:00:00.000Z');
const EXPIRES_AT = new Date('2024-03-08T00:00:00.000Z');

function makeInvitation(
  overrides: Partial<Parameters<typeof Invitation.create>[0]> = {},
): Invitation {
  return Invitation.create({
    id: InvitationId.create('inv-1'),
    workspaceId: WorkspaceId.create('ws-1'),
    email: 'invitee@example.com',
    role: 'editor',
    tokenHash: 'hash-1',
    invitedBy: INVITER,
    expiresAt: EXPIRES_AT,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  });
}

function repositoryStub(watch: InvitationRepository['watchPendingByEmail']): InvitationRepository {
  return {
    create: async (invitation) => invitation,
    findById: async () => null,
    findByTokenHash: async () => null,
    listPendingByWorkspace: async () => [],
    listPendingByEmail: async () => [],
    watchPendingByEmail: watch,
    updateStatus: async () => {
      throw new Error('not used');
    },
  };
}

describe('createWatchPendingInvitationsForUser', () => {
  it('emits the initial pending invitations for the normalized email, newest first', async () => {
    const repository = new FakeInvitationRepository();
    const older = makeInvitation({ id: InvitationId.create('inv-a') });
    const newer = makeInvitation({
      id: InvitationId.create('inv-b'),
      workspaceId: WorkspaceId.create('ws-2'),
      createdAt: new Date('2024-02-01T00:00:00.000Z'),
      updatedAt: new Date('2024-02-01T00:00:00.000Z'),
    });
    const other = makeInvitation({
      id: InvitationId.create('inv-c'),
      email: 'other@example.com',
      tokenHash: 'hash-c',
    });
    await repository.create(older);
    await repository.create(newer);
    await repository.create(other);

    const listener = jest.fn();
    const watch = createWatchPendingInvitationsForUser(repository);
    const unsubscribe = watch('  INVITEE@example.com ', listener);

    expect(listener).toHaveBeenLastCalledWith([newer, older]);
    unsubscribe();
  });

  it('emits again when a new invitation arrives and stops after unsubscribe', async () => {
    const repository = new FakeInvitationRepository();
    const listener = jest.fn();
    const watch = createWatchPendingInvitationsForUser(repository);
    const unsubscribe = watch('invitee@example.com', listener);

    const invitation = makeInvitation();
    await repository.create(invitation);

    expect(listener).toHaveBeenLastCalledWith([invitation]);

    unsubscribe();
    await repository.updateStatus(invitation.id, 'accepted');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('emits an empty list for an empty email without watching the repository', () => {
    const watchPendingByEmail = jest.fn();
    const repository = repositoryStub(watchPendingByEmail);
    const listener = jest.fn();

    const unsubscribe = createWatchPendingInvitationsForUser(repository)('   ', listener);

    expect(listener).toHaveBeenCalledWith([]);
    expect(watchPendingByEmail).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('maps repository errors into AppError instances', () => {
    const repository = repositoryStub((_email, _listener, onError) => {
      onError?.(
        createAppError(
          'network',
          ERROR_CODES.NETWORK_REQUEST_FAILED,
          'The network connection was lost.',
        ),
      );
      return () => undefined;
    });
    const onError: WatchPendingInvitationsForUserErrorListener = jest.fn();

    createWatchPendingInvitationsForUser(repository)('invitee@example.com', jest.fn(), onError);

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: ERROR_CODES.NETWORK_REQUEST_FAILED }),
    );
  });
});
