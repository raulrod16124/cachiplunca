import {
  createAcceptInvitationById,
  type AcceptInvitationByIdDeps,
} from '../../../../application/commands';
import { Invitation } from '../../../../domain/invitation';
import { InvitationId, UserId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeInvitationRepository } from '../../../fixtures/fake-invitation-repository';
import { FakeMembershipRepository } from '../../../fixtures/fake-membership-repository';

const WORKSPACE = WorkspaceId.create('ws-1');
const INVITEE = UserId.create('user-invitee');
const INVITER = UserId.create('user-1');
const CREATED_AT = new Date('2024-01-01T00:00:00.000Z');
const EXPIRES_AT = new Date('2024-01-08T00:00:00.000Z');
const NOW = new Date('2024-01-02T00:00:00.000Z');

function seedInvitation(
  overrides: Partial<Parameters<typeof Invitation.create>[0]> = {},
): Invitation {
  return Invitation.create({
    id: InvitationId.create('inv-1'),
    workspaceId: WORKSPACE,
    email: 'invitee@example.com',
    role: 'editor',
    tokenHash: 'hash-token-1',
    invitedBy: INVITER,
    expiresAt: EXPIRES_AT,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  });
}

function setup(overrides: Partial<AcceptInvitationByIdDeps> = {}): {
  invitations: FakeInvitationRepository;
  memberships: FakeMembershipRepository;
  deps: AcceptInvitationByIdDeps;
} {
  const invitations = new FakeInvitationRepository();
  const memberships = new FakeMembershipRepository();
  const deps: AcceptInvitationByIdDeps = {
    invitationRepository: invitations,
    membershipRepository: memberships,
    now: () => NOW,
    ...overrides,
  };
  return { invitations, memberships, deps };
}

describe('createAcceptInvitationById', () => {
  it('creates a membership with the invited role and marks the invitation accepted', async () => {
    const { invitations, memberships, deps } = setup();
    const invitation = seedInvitation();
    await invitations.create(invitation);
    const acceptInvitation = createAcceptInvitationById(deps);

    const result = await acceptInvitation({
      invitationId: invitation.id,
      userId: INVITEE,
      userEmail: 'invitee@example.com',
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }
    expect(result.workspaceId.equals(WORKSPACE)).toBe(true);
    expect(result.role).toBe('editor');
    await expect(memberships.findByUserAndWorkspace(INVITEE, WORKSPACE)).resolves.toMatchObject({
      role: 'editor',
    });
    await expect(invitations.findById(invitation.id)).resolves.toMatchObject({
      status: 'accepted',
    });
  });

  it('normalizes the user email before comparing it with the invitation', async () => {
    const { invitations, deps } = setup();
    const invitation = seedInvitation();
    await invitations.create(invitation);
    const acceptInvitation = createAcceptInvitationById(deps);

    const result = await acceptInvitation({
      invitationId: invitation.id,
      userId: INVITEE,
      userEmail: '  INVITEE@example.com ',
    });

    expect(result.status).toBe('ok');
  });

  it('rejects an unknown invitation id', async () => {
    const { deps } = setup();
    const acceptInvitation = createAcceptInvitationById(deps);

    const result = await acceptInvitation({
      invitationId: InvitationId.create('missing'),
      userId: INVITEE,
      userEmail: 'invitee@example.com',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('notFound');
      expect(result.error.code).toBe(ERROR_CODES.INVITATION_INVALID);
    }
  });

  it('rejects an already accepted invitation', async () => {
    const { invitations, deps } = setup();
    const invitation = seedInvitation();
    await invitations.create(invitation);
    await invitations.updateStatus(invitation.id, 'accepted');
    const acceptInvitation = createAcceptInvitationById(deps);

    const result = await acceptInvitation({
      invitationId: invitation.id,
      userId: INVITEE,
      userEmail: 'invitee@example.com',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.code).toBe(ERROR_CODES.INVITATION_INVALID);
    }
  });

  it('rejects an expired invitation', async () => {
    const { invitations, deps } = setup({ now: () => new Date('2024-02-01T00:00:00.000Z') });
    const invitation = seedInvitation();
    await invitations.create(invitation);
    const acceptInvitation = createAcceptInvitationById(deps);

    const result = await acceptInvitation({
      invitationId: invitation.id,
      userId: INVITEE,
      userEmail: 'invitee@example.com',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.code).toBe(ERROR_CODES.INVITATION_EXPIRED);
    }
  });

  it('rejects an invitation issued for a different email', async () => {
    const { invitations, deps } = setup();
    const invitation = seedInvitation();
    await invitations.create(invitation);
    const acceptInvitation = createAcceptInvitationById(deps);

    const result = await acceptInvitation({
      invitationId: invitation.id,
      userId: INVITEE,
      userEmail: 'someone-else@example.com',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.code).toBe(ERROR_CODES.INVITATION_EMAIL_MISMATCH);
    }
  });

  it('rolls back the membership when marking the invitation accepted fails', async () => {
    const { invitations, memberships, deps } = setup();
    const invitation = seedInvitation();
    await invitations.create(invitation);
    jest.spyOn(invitations, 'updateStatus').mockRejectedValue({
      kind: 'persistence',
      code: ERROR_CODES.PERSISTENCE_WRITE_FAILED,
      message: 'write failed',
    });
    const acceptInvitation = createAcceptInvitationById(deps);

    const result = await acceptInvitation({
      invitationId: invitation.id,
      userId: INVITEE,
      userEmail: 'invitee@example.com',
    });

    expect(result.status).toBe('error');
    await expect(memberships.findByUserAndWorkspace(INVITEE, WORKSPACE)).resolves.toBeNull();
  });
});
