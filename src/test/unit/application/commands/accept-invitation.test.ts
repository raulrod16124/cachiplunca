import {
  createAcceptInvitation,
  validateAcceptInvitationInput,
  type AcceptInvitationDeps,
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

function setup(overrides: Partial<AcceptInvitationDeps> = {}): {
  invitations: FakeInvitationRepository;
  memberships: FakeMembershipRepository;
  deps: AcceptInvitationDeps;
} {
  const invitations = new FakeInvitationRepository();
  const memberships = new FakeMembershipRepository();
  const deps: AcceptInvitationDeps = {
    invitationRepository: invitations,
    membershipRepository: memberships,
    hashToken: async (token) => `hash-${token}`,
    now: () => NOW,
    ...overrides,
  };
  return { invitations, memberships, deps };
}

describe('validateAcceptInvitationInput', () => {
  it('reports a missing token', () => {
    expect(
      validateAcceptInvitationInput({ token: '   ', userId: INVITEE, userEmail: 'a@b.com' }),
    ).toEqual({ token: 'This invitation link is missing its token.' });
  });
});

describe('createAcceptInvitation', () => {
  it('creates a membership with the invited role and marks the invitation accepted', async () => {
    const { invitations, memberships, deps } = setup();
    const invitation = seedInvitation();
    await invitations.create(invitation);
    const acceptInvitation = createAcceptInvitation(deps);

    const result = await acceptInvitation({
      token: 'token-1',
      userId: INVITEE,
      userEmail: 'invitee@example.com',
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }
    expect(result.workspaceId.equals(WORKSPACE)).toBe(true);
    expect(result.role).toBe('editor');

    const membership = await memberships.findByUserAndWorkspace(INVITEE, WORKSPACE);
    expect(membership?.role).toBe('editor');
    const stored = await invitations.findByTokenHash('hash-token-1');
    expect(stored?.status).toBe('accepted');
  });

  it('returns invalid-input without touching the repositories for a missing token', async () => {
    const { invitations, memberships, deps } = setup();
    const findSpy = jest.spyOn(invitations, 'findByTokenHash');
    const createSpy = jest.spyOn(memberships, 'create');
    const acceptInvitation = createAcceptInvitation(deps);

    const result = await acceptInvitation({
      token: '',
      userId: INVITEE,
      userEmail: 'invitee@example.com',
    });

    expect(result.status).toBe('invalid-input');
    expect(findSpy).not.toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('rejects an unknown token as an invalid invitation', async () => {
    const { deps } = setup();
    const acceptInvitation = createAcceptInvitation(deps);

    const result = await acceptInvitation({
      token: 'unknown',
      userId: INVITEE,
      userEmail: 'invitee@example.com',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('notFound');
      expect(result.error.code).toBe(ERROR_CODES.INVITATION_INVALID);
    }
  });

  it('rejects an already accepted invitation as an invalid invitation', async () => {
    const { invitations, deps } = setup();
    await invitations.create(seedInvitation());
    await invitations.updateStatus(InvitationId.create('inv-1'), 'accepted');
    const acceptInvitation = createAcceptInvitation(deps);

    const result = await acceptInvitation({
      token: 'token-1',
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
    await invitations.create(seedInvitation());
    const acceptInvitation = createAcceptInvitation(deps);

    const result = await acceptInvitation({
      token: 'token-1',
      userId: INVITEE,
      userEmail: 'invitee@example.com',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.INVITATION_EXPIRED);
    }
  });

  it('rejects an accept from a different email', async () => {
    const { invitations, deps } = setup();
    await invitations.create(seedInvitation());
    const acceptInvitation = createAcceptInvitation(deps);

    const result = await acceptInvitation({
      token: 'token-1',
      userId: INVITEE,
      userEmail: 'someone-else@example.com',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('authorization');
      expect(result.error.code).toBe(ERROR_CODES.INVITATION_EMAIL_MISMATCH);
    }
  });

  it('rejects an empty user email as an email mismatch', async () => {
    const { invitations, deps } = setup();
    await invitations.create(seedInvitation());
    const acceptInvitation = createAcceptInvitation(deps);

    const result = await acceptInvitation({
      token: 'token-1',
      userId: INVITEE,
      userEmail: '',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.code).toBe(ERROR_CODES.INVITATION_EMAIL_MISMATCH);
    }
  });

  it('normalizes an existing membership conflict into a conflict AppError', async () => {
    const { invitations, memberships, deps } = setup();
    await invitations.create(seedInvitation());
    await memberships.create({ userId: INVITEE, workspaceId: WORKSPACE, role: 'viewer' });
    const acceptInvitation = createAcceptInvitation(deps);

    const result = await acceptInvitation({
      token: 'token-1',
      userId: INVITEE,
      userEmail: 'invitee@example.com',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('conflict');
      expect(result.error.code).toBe(ERROR_CODES.MEMBERSHIP_ALREADY_EXISTS);
    }
  });

  it('rolls back the membership when marking the invitation accepted fails', async () => {
    const { invitations, memberships, deps } = setup();
    await invitations.create(seedInvitation());
    jest.spyOn(invitations, 'updateStatus').mockRejectedValue({
      kind: 'persistence',
      code: ERROR_CODES.PERSISTENCE_WRITE_FAILED,
      message: 'write failed',
    });
    const acceptInvitation = createAcceptInvitation(deps);

    const result = await acceptInvitation({
      token: 'token-1',
      userId: INVITEE,
      userEmail: 'invitee@example.com',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.code).toBe(ERROR_CODES.PERSISTENCE_WRITE_FAILED);
      expect(result.error.details?.membershipRollbackFailed).toBeUndefined();
    }
    await expect(memberships.findByUserAndWorkspace(INVITEE, WORKSPACE)).resolves.toBeNull();
  });

  it('annotates the error when the rollback also fails', async () => {
    const { invitations, memberships, deps } = setup();
    await invitations.create(seedInvitation());
    jest.spyOn(invitations, 'updateStatus').mockRejectedValue({
      kind: 'persistence',
      code: ERROR_CODES.PERSISTENCE_WRITE_FAILED,
      message: 'write failed',
    });
    jest.spyOn(memberships, 'delete').mockRejectedValue(new Error('delete failed'));
    const acceptInvitation = createAcceptInvitation(deps);

    const result = await acceptInvitation({
      token: 'token-1',
      userId: INVITEE,
      userEmail: 'invitee@example.com',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.details?.membershipRollbackFailed).toBe(true);
    }
  });

  it('normalizes unexpected repository errors into an unknown AppError', async () => {
    const { invitations, deps } = setup();
    await invitations.create(seedInvitation());
    jest.spyOn(invitations, 'findByTokenHash').mockRejectedValue(new Error('socket hang up'));
    const acceptInvitation = createAcceptInvitation(deps);

    const result = await acceptInvitation({
      token: 'token-1',
      userId: INVITEE,
      userEmail: 'invitee@example.com',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    }
  });
});
