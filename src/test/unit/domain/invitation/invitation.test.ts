import { Invitation } from '../../../../domain/invitation';
import type { MembershipRole } from '../../../../domain/membership';
import { InvitationId, UserId, WorkspaceId } from '../../../../domain/shared';

const workspaceId = WorkspaceId.create('ws-1');
const invitedBy = UserId.create('user-1');
const createdAt = new Date('2024-01-01T00:00:00.000Z');
const expiresAt = new Date('2024-01-08T00:00:00.000Z');

function createInvitation(
  overrides: Partial<{
    email: string;
    role: MembershipRole;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
): Invitation {
  return Invitation.create({
    id: InvitationId.create('inv-1'),
    workspaceId,
    email: overrides.email ?? 'Invitee@Example.com',
    role: overrides.role ?? 'editor',
    tokenHash: overrides.tokenHash ?? 'hash-1',
    invitedBy,
    expiresAt: overrides.expiresAt ?? expiresAt,
    createdAt: overrides.createdAt ?? createdAt,
    updatedAt: overrides.updatedAt,
  });
}

describe('Invitation', () => {
  it('creates a pending invitation with valid data', () => {
    const invitation = createInvitation();

    expect(invitation.id.value).toBe('inv-1');
    expect(invitation.workspaceId).toBe(workspaceId);
    expect(invitation.role).toBe('editor');
    expect(invitation.tokenHash).toBe('hash-1');
    expect(invitation.status).toBe('pending');
    expect(invitation.invitedBy).toBe(invitedBy);
    expect(invitation.expiresAt).toBe(expiresAt);
    expect(invitation.createdAt).toBe(createdAt);
    expect(invitation.updatedAt).toBe(createdAt);
  });

  it('normalizes the email by trimming and lowercasing', () => {
    const invitation = createInvitation({ email: '  Invitee@Example.com  ' });

    expect(invitation.email).toBe('invitee@example.com');
  });

  it('defaults timestamps to now when not provided', () => {
    const before = new Date();
    const invitation = Invitation.create({
      id: InvitationId.create('inv-1'),
      workspaceId,
      email: 'invitee@example.com',
      role: 'viewer',
      tokenHash: 'hash-1',
      invitedBy,
      expiresAt: new Date(before.getTime() + 1000),
    });
    const after = new Date();

    expect(invitation.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(invitation.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(invitation.updatedAt.getTime()).toBe(invitation.createdAt.getTime());
  });

  it('throws when the email is empty', () => {
    expect(() => createInvitation({ email: '   ' })).toThrow('Invitation email cannot be empty');
  });

  it('throws when the email is invalid', () => {
    expect(() => createInvitation({ email: 'not-an-email' })).toThrow('Invalid invitation email');
  });

  it('throws when the role is invalid', () => {
    expect(() => createInvitation({ role: 'admin' as MembershipRole })).toThrow(
      'Invalid membership role',
    );
  });

  it('throws when the token hash is empty', () => {
    expect(() => createInvitation({ tokenHash: '  ' })).toThrow(
      'Invitation token hash cannot be empty',
    );
  });

  it('throws when expiresAt is not after createdAt', () => {
    expect(() => createInvitation({ expiresAt: createdAt })).toThrow(
      'Expires at must be after created at',
    );
  });

  it('throws when expiresAt is an invalid date', () => {
    expect(() => createInvitation({ expiresAt: new Date('invalid') })).toThrow(
      'Expires at must be a valid Date instance',
    );
  });

  it('throws when timestamps are invalid', () => {
    expect(() => createInvitation({ createdAt: new Date('invalid') })).toThrow(
      'Timestamps must be valid Date instances',
    );
  });

  it('throws when updatedAt is before createdAt', () => {
    expect(() => createInvitation({ updatedAt: new Date('2023-12-31T00:00:00.000Z') })).toThrow(
      'Updated at cannot be before created at',
    );
  });

  it('accepts a pending invitation as a new instance', () => {
    const invitation = createInvitation();
    const updatedAt = new Date(createdAt.getTime() + 1000);

    const accepted = invitation.accept(updatedAt);

    expect(accepted).not.toBe(invitation);
    expect(accepted.status).toBe('accepted');
    expect(accepted.updatedAt).toBe(updatedAt);
    expect(accepted.email).toBe(invitation.email);
    expect(accepted.tokenHash).toBe(invitation.tokenHash);
    expect(accepted.createdAt).toBe(invitation.createdAt);
  });

  it('revokes a pending invitation as a new instance', () => {
    const invitation = createInvitation();

    const revoked = invitation.revoke(new Date(createdAt.getTime() + 1000));

    expect(revoked).not.toBe(invitation);
    expect(revoked.status).toBe('revoked');
  });

  it('cannot accept an already accepted invitation', () => {
    const accepted = createInvitation().accept(new Date(createdAt.getTime() + 1000));

    expect(() => accepted.accept()).toThrow('Cannot accept an invitation with status accepted');
  });

  it('cannot revoke a revoked invitation', () => {
    const revoked = createInvitation().revoke(new Date(createdAt.getTime() + 1000));

    expect(() => revoked.revoke()).toThrow('Cannot revoke an invitation with status revoked');
  });

  it('reports pending and expiry state', () => {
    const invitation = createInvitation();

    expect(invitation.isPending()).toBe(true);
    expect(invitation.isExpired(new Date('2024-01-07T00:00:00.000Z'))).toBe(false);
    expect(invitation.isExpired(new Date('2024-01-08T00:00:00.000Z'))).toBe(true);
    expect(invitation.isExpired(new Date('2024-01-09T00:00:00.000Z'))).toBe(true);
  });

  it('matches email case-insensitively', () => {
    const invitation = createInvitation();

    expect(invitation.isForEmail('INVITEE@example.com')).toBe(true);
    expect(invitation.isForEmail('other@example.com')).toBe(false);
  });

  it('serializes to JSON correctly', () => {
    const invitation = createInvitation();

    expect(invitation.toJSON()).toEqual({
      id: 'inv-1',
      workspaceId: 'ws-1',
      email: 'invitee@example.com',
      role: 'editor',
      tokenHash: 'hash-1',
      status: 'pending',
      invitedBy: 'user-1',
      expiresAt: '2024-01-08T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
  });
});
