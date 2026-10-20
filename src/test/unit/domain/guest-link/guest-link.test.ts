import { GUEST_LINK_ROLE, GuestLink } from '../../../../domain/guest-link';
import { UserId, WorkspaceId } from '../../../../domain/shared';

const TOKEN_HASH = 'a'.repeat(64);
const WORKSPACE = WorkspaceId.create('ws-1');
const CREATOR = UserId.create('user-1');
const CREATED_AT = new Date('2026-10-20T10:00:00.000Z');

function makeLink(overrides: Partial<Parameters<typeof GuestLink.create>[0]> = {}): GuestLink {
  return GuestLink.create({
    tokenHash: TOKEN_HASH,
    workspaceId: WORKSPACE,
    createdBy: CREATOR,
    createdAt: CREATED_AT,
    ...overrides,
  });
}

describe('GuestLink', () => {
  it('creates an active viewer link with the provided identity', () => {
    const link = makeLink();

    expect(link.tokenHash).toBe(TOKEN_HASH);
    expect(link.workspaceId).toBe(WORKSPACE);
    expect(link.createdBy).toBe(CREATOR);
    expect(link.createdAt).toBe(CREATED_AT);
    expect(link.updatedAt).toBe(CREATED_AT);
    expect(link.revokedAt).toBeUndefined();
    expect(link.role).toBe(GUEST_LINK_ROLE);
    expect(link.isActive()).toBe(true);
  });

  it('normalizes the token hash to lowercase', () => {
    const link = makeLink({ tokenHash: 'A'.repeat(64) });

    expect(link.tokenHash).toBe('a'.repeat(64));
  });

  it('rejects token hashes that are not SHA-256 hex strings', () => {
    expect(() => makeLink({ tokenHash: 'short' })).toThrow(
      'Guest link token hash must be a SHA-256 hex string',
    );
    expect(() => makeLink({ tokenHash: 'g'.repeat(64) })).toThrow(
      'Guest link token hash must be a SHA-256 hex string',
    );
  });

  it('rejects invalid timestamps and updatedAt before createdAt', () => {
    expect(() => makeLink({ createdAt: new Date('invalid') })).toThrow(
      'Created at must be a valid Date instance',
    );
    expect(() => makeLink({ updatedAt: new Date(CREATED_AT.getTime() - 1) })).toThrow(
      'Updated at cannot be before created at',
    );
  });

  it('revokes the link and is idempotent afterwards', () => {
    const revokedAt = new Date(CREATED_AT.getTime() + 60_000);
    const link = makeLink();

    const revoked = link.revoke(revokedAt);

    expect(revoked.isActive()).toBe(false);
    expect(revoked.revokedAt).toBe(revokedAt);
    expect(revoked.updatedAt).toBe(revokedAt);
    expect(link.isActive()).toBe(true);
    expect(revoked.revoke(new Date(revokedAt.getTime() + 60_000))).toBe(revoked);
  });

  it('rejects revoking before creation', () => {
    expect(() => makeLink().revoke(new Date(CREATED_AT.getTime() - 1))).toThrow(
      'Revoked at cannot be before created at',
    );
  });
});
