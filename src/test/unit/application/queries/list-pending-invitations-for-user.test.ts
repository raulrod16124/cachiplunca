import {
  createListPendingInvitationsForUser,
  sortPendingInvitations,
} from '../../../../application/queries';
import { Invitation } from '../../../../domain/invitation';
import { InvitationId, UserId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';
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

describe('sortPendingInvitations', () => {
  it('orders newest invitations first and breaks ties by id', () => {
    const older = makeInvitation({
      id: InvitationId.create('inv-a'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    });
    const newer = makeInvitation({
      id: InvitationId.create('inv-b'),
      workspaceId: WorkspaceId.create('ws-2'),
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-01'),
    });

    expect(sortPendingInvitations([older, newer]).map((item) => item.id.value)).toEqual([
      'inv-b',
      'inv-a',
    ]);
  });
});

describe('createListPendingInvitationsForUser', () => {
  it('returns only pending invitations for the normalized email', async () => {
    const repository = new FakeInvitationRepository();
    const pending = makeInvitation();
    const other = makeInvitation({
      id: InvitationId.create('inv-2'),
      email: 'other@example.com',
      tokenHash: 'hash-2',
    });
    await repository.create(pending);
    await repository.create(other);
    const listPending = createListPendingInvitationsForUser(repository);

    const result = await listPending('  INVITEE@example.com ');

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.invitations.map((item) => item.id.value)).toEqual(['inv-1']);
    }
  });

  it('returns an empty list for an empty email without touching the repository', async () => {
    const repository = new FakeInvitationRepository();
    const spy = jest.spyOn(repository, 'listPendingByEmail');
    const listPending = createListPendingInvitationsForUser(repository);

    const result = await listPending('   ');

    expect(result).toEqual({ status: 'ok', invitations: [] });
    expect(spy).not.toHaveBeenCalled();
  });

  it('preserves AppErrors from the repository', async () => {
    const repository = new FakeInvitationRepository();
    jest.spyOn(repository, 'listPendingByEmail').mockRejectedValue({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
      message: 'Network request failed.',
    });
    const listPending = createListPendingInvitationsForUser(repository);

    const result = await listPending('invitee@example.com');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
    }
  });
});
