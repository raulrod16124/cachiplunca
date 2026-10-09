export type MembershipRole = 'owner' | 'editor' | 'viewer';

const VALID_ROLES: readonly MembershipRole[] = ['owner', 'editor', 'viewer'] as const;

export function isValidRole(role: unknown): role is MembershipRole {
  return typeof role === 'string' && (VALID_ROLES as readonly string[]).includes(role);
}

export function validateRole(role: unknown): MembershipRole {
  if (!isValidRole(role)) {
    throw new Error('Invalid membership role');
  }
  return role;
}
