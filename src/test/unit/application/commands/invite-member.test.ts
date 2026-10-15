import {
  createInviteMember,
  INVITATION_TTL_MS,
  validateInviteMemberInput,
  type InviteMemberDeps,
} from '../../../../application/commands';
import type { MembershipRole } from '../../../../domain/membership';
import { InvitationId, UserId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeInvitationRepository } from '../../../fixtures/fake-invitation-repository';
import { FakeMembershipRepository } from '../../../fixtures/fake-membership-repository';

const WORKSPACE = WorkspaceId.create('ws-1');
const OTHER_WORKSPACE = WorkspaceId.create('ws-2');
const OWNER = UserId.create('owner-user');
const EDITOR = UserId.create('editor-user');
const VIEWER = UserId.create('viewer-user');
const OUTSIDER = UserId.create('outsider-user');
const NOW = new Date('2024-01-01T00:00:00.000Z');

function setup(overrides: Partial<InviteMemberDeps> = {}): {
  invitations: FakeInvitationRepository;
  memberships: FakeMembershipRepository;
  deps: InviteMemberDeps;
} {
  const invitations = new FakeInvitationRepository();
  const memberships = new FakeMembershipRepository();
  let idCounter = 0;
  let tokenCounter = 0;
  const deps: InviteMemberDeps = {
    invitationRepository: invitations,
    membershipRepository: memberships,
    generateId: () => InvitationId.create(`inv-${++idCounter}`),
    issueToken: async () => {
      const n = ++tokenCounter;
      return { token: `token-${n}`, tokenHash: `hash-${n}` };
    },
    now: () => NOW,
    ...overrides,
  };
  return { invitations, memberships, deps };
}

async function seedMembership(
  memberships: FakeMembershipRepository,
  userId: UserId,
  workspaceId: WorkspaceId,
  role: MembershipRole,
): Promise<void> {
  await memberships.create({ userId, workspaceId, role });
}

describe('validateInviteMemberInput', () => {
  it('reports missing and invalid emails', () => {
    expect(
      validateInviteMemberInput({
        workspaceId: WORKSPACE,
        email: '  ',
        role: 'editor',
        invitedBy: OWNER,
      }),
    ).toEqual({
      email: 'Enter the email address to invite.',
    });
    expect(
      validateInviteMemberInput({
        workspaceId: WORKSPACE,
        email: 'nope',
        role: 'editor',
        invitedBy: OWNER,
      }),
    ).toEqual({ email: 'Enter a valid email address.' });
  });

  it('reports invalid roles', () => {
    expect(
      validateInviteMemberInput({
        workspaceId: WORKSPACE,
        email: 'invitee@example.com',
        role: 'admin' as MembershipRole,
        invitedBy: OWNER,
      }),
    ).toEqual({ role: 'Choose a valid role.' });
  });
});

describe('createInviteMember', () => {
  it('creates a pending invitation and returns the raw token', async () => {
    const { invitations, memberships, deps } = setup();
    await seedMembership(memberships, OWNER, WORKSPACE, 'owner');
    const inviteMember = createInviteMember(deps);

    const result = await inviteMember({
      workspaceId: WORKSPACE,
      email: '  Invitee@Example.com ',
      role: 'editor',
      invitedBy: OWNER,
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(result.token).toBe('token-1');
    expect(result.invitation.status).toBe('pending');
    expect(result.invitation.email).toBe('invitee@example.com');
    expect(result.invitation.role).toBe('editor');
    expect(result.invitation.createdAt).toBe(NOW);
    expect(result.invitation.expiresAt.getTime()).toBe(NOW.getTime() + INVITATION_TTL_MS);
    await expect(invitations.findByTokenHash('hash-1')).resolves.toBe(result.invitation);
  });

  it('never persists the raw token, only its hash', async () => {
    const { invitations, memberships, deps } = setup();
    await seedMembership(memberships, OWNER, WORKSPACE, 'owner');
    const inviteMember = createInviteMember(deps);

    const result = await inviteMember({
      workspaceId: WORKSPACE,
      email: 'invitee@example.com',
      role: 'viewer',
      invitedBy: OWNER,
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }
    expect(result.invitation.tokenHash).toBe('hash-1');
    expect(result.invitation.tokenHash).not.toBe(result.token);
    expect(await invitations.findByTokenHash(result.token)).toBeNull();
  });

  it('honours a custom ttl', async () => {
    const { memberships, deps } = setup({ ttlMs: 60_000 });
    await seedMembership(memberships, OWNER, WORKSPACE, 'owner');
    const inviteMember = createInviteMember(deps);

    const result = await inviteMember({
      workspaceId: WORKSPACE,
      email: 'invitee@example.com',
      role: 'viewer',
      invitedBy: OWNER,
    });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.invitation.expiresAt.getTime()).toBe(NOW.getTime() + 60_000);
    }
  });

  it('returns invalid-input without touching the repository', async () => {
    const { invitations, deps } = setup();
    const createSpy = jest.spyOn(invitations, 'create');
    const inviteMember = createInviteMember(deps);

    const result = await inviteMember({
      workspaceId: WORKSPACE,
      email: 'invalid',
      role: 'admin' as MembershipRole,
      invitedBy: OWNER,
    });

    expect(result.status).toBe('invalid-input');
    if (result.status === 'invalid-input') {
      expect(result.fieldErrors).toEqual({
        email: 'Enter a valid email address.',
        role: 'Choose a valid role.',
      });
    }
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('rejects an editor trying to invite with owner role', async () => {
    const { memberships, deps } = setup();
    await seedMembership(memberships, EDITOR, WORKSPACE, 'editor');
    const inviteMember = createInviteMember(deps);

    const result = await inviteMember({
      workspaceId: WORKSPACE,
      email: 'invitee@example.com',
      role: 'owner',
      invitedBy: EDITOR,
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('authorization');
      expect(result.error.code).toBe(ERROR_CODES.AUTH_FORBIDDEN);
    }
  });

  it('rejects an outsider without membership', async () => {
    const { deps } = setup();
    const inviteMember = createInviteMember(deps);

    const result = await inviteMember({
      workspaceId: WORKSPACE,
      email: 'invitee@example.com',
      role: 'viewer',
      invitedBy: OUTSIDER,
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('authorization');
      expect(result.error.code).toBe(ERROR_CODES.AUTH_FORBIDDEN);
    }
  });

  it('rejects a viewer trying to invite anyone', async () => {
    const { memberships, deps } = setup();
    await seedMembership(memberships, VIEWER, WORKSPACE, 'viewer');
    const inviteMember = createInviteMember(deps);

    const result = await inviteMember({
      workspaceId: WORKSPACE,
      email: 'invitee@example.com',
      role: 'viewer',
      invitedBy: VIEWER,
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('authorization');
      expect(result.error.code).toBe(ERROR_CODES.AUTH_FORBIDDEN);
    }
  });

  it('allows an owner to invite another owner', async () => {
    const { invitations, memberships, deps } = setup();
    await seedMembership(memberships, OWNER, WORKSPACE, 'owner');
    const inviteMember = createInviteMember(deps);

    const result = await inviteMember({
      workspaceId: WORKSPACE,
      email: 'invitee@example.com',
      role: 'owner',
      invitedBy: OWNER,
    });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.invitation.role).toBe('owner');
      await expect(invitations.findByTokenHash('hash-1')).resolves.toBe(result.invitation);
    }
  });

  it('allows an editor to invite an editor', async () => {
    const { invitations, memberships, deps } = setup();
    await seedMembership(memberships, EDITOR, WORKSPACE, 'editor');
    const inviteMember = createInviteMember(deps);

    const result = await inviteMember({
      workspaceId: WORKSPACE,
      email: 'invitee@example.com',
      role: 'editor',
      invitedBy: EDITOR,
    });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.invitation.role).toBe('editor');
      await expect(invitations.findByTokenHash('hash-1')).resolves.toBe(result.invitation);
    }
  });

  it('propagates a duplicate pending invitation as a conflict error', async () => {
    const { memberships, deps } = setup();
    await seedMembership(memberships, OWNER, WORKSPACE, 'owner');
    const inviteMember = createInviteMember(deps);
    const input = {
      workspaceId: WORKSPACE,
      email: 'invitee@example.com',
      role: 'editor' as const,
      invitedBy: OWNER,
    };

    await inviteMember(input);
    const result = await inviteMember(input);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('conflict');
      expect(result.error.code).toBe(ERROR_CODES.INVITATION_ALREADY_EXISTS);
    }
  });

  it('creates independent invitations across workspaces and emails', async () => {
    const { invitations, memberships, deps } = setup();
    await seedMembership(memberships, OWNER, WORKSPACE, 'owner');
    await seedMembership(memberships, OWNER, OTHER_WORKSPACE, 'owner');
    const inviteMember = createInviteMember(deps);

    await inviteMember({
      workspaceId: WORKSPACE,
      email: 'a@example.com',
      role: 'editor',
      invitedBy: OWNER,
    });
    await inviteMember({
      workspaceId: OTHER_WORKSPACE,
      email: 'a@example.com',
      role: 'editor',
      invitedBy: OWNER,
    });
    await inviteMember({
      workspaceId: WORKSPACE,
      email: 'b@example.com',
      role: 'viewer',
      invitedBy: OWNER,
    });

    await expect(invitations.listPendingByWorkspace(WORKSPACE)).resolves.toHaveLength(2);
    await expect(invitations.listPendingByWorkspace(OTHER_WORKSPACE)).resolves.toHaveLength(1);
  });

  it('preserves AppErrors thrown by the repository', async () => {
    const { invitations, memberships, deps } = setup();
    await seedMembership(memberships, OWNER, WORKSPACE, 'owner');
    jest.spyOn(invitations, 'create').mockRejectedValue({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
      message: 'Network request failed.',
    });
    const inviteMember = createInviteMember(deps);

    const result = await inviteMember({
      workspaceId: WORKSPACE,
      email: 'invitee@example.com',
      role: 'viewer',
      invitedBy: OWNER,
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('network');
      expect(result.error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
    }
  });

  it('normalizes unexpected repository errors into an unknown AppError', async () => {
    const { invitations, memberships, deps } = setup();
    await seedMembership(memberships, OWNER, WORKSPACE, 'owner');
    jest.spyOn(invitations, 'create').mockRejectedValue(new Error('socket hang up'));
    const inviteMember = createInviteMember(deps);

    const result = await inviteMember({
      workspaceId: WORKSPACE,
      email: 'invitee@example.com',
      role: 'viewer',
      invitedBy: OWNER,
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    }
  });
});
