import type { MembershipRole } from './role';

export type WorkspaceOperation =
  | 'workspace:view'
  | 'workspace:update'
  | 'workspace:delete'
  | 'element:write'
  | 'member:invite'
  | 'member:update-role'
  | 'member:remove'
  | 'member:leave';

export const WORKSPACE_OPERATIONS: readonly WorkspaceOperation[] = [
  'workspace:view',
  'workspace:update',
  'workspace:delete',
  'element:write',
  'member:invite',
  'member:update-role',
  'member:remove',
  'member:leave',
] as const;

export const PERMISSION_MATRIX: Readonly<Record<MembershipRole, readonly WorkspaceOperation[]>> = {
  owner: [...WORKSPACE_OPERATIONS],
  editor: ['workspace:view', 'element:write', 'member:invite', 'member:leave'],
  viewer: ['workspace:view', 'member:leave'],
};

export const GRANTABLE_ROLES: Readonly<Record<MembershipRole, readonly MembershipRole[]>> = {
  owner: ['owner', 'editor', 'viewer'],
  editor: ['editor', 'viewer'],
  viewer: [],
};

export function can(role: MembershipRole, operation: WorkspaceOperation): boolean {
  return PERMISSION_MATRIX[role].includes(operation);
}

export function canGrantRole(actorRole: MembershipRole, grantedRole: MembershipRole): boolean {
  return GRANTABLE_ROLES[actorRole].includes(grantedRole);
}
