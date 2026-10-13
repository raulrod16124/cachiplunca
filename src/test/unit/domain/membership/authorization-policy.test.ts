import {
  can,
  PERMISSION_MATRIX,
  WORKSPACE_OPERATIONS,
} from '../../../../domain/membership/authorization-policy';
import type { MembershipRole } from '../../../../domain/membership';

const ALL_ROLES: readonly MembershipRole[] = ['owner', 'editor', 'viewer'];

const EXPECTED_MATRIX: Readonly<Record<MembershipRole, readonly string[]>> = {
  owner: [
    'workspace:view',
    'workspace:update',
    'workspace:delete',
    'element:write',
    'member:invite',
    'member:update-role',
    'member:remove',
    'member:leave',
  ],
  editor: ['workspace:view', 'element:write', 'member:invite', 'member:leave'],
  viewer: ['workspace:view', 'member:leave'],
};

describe('authorization-policy', () => {
  it('declares the complete set of workspace operations', () => {
    expect(new Set(WORKSPACE_OPERATIONS).size).toBe(WORKSPACE_OPERATIONS.length);
    expect(WORKSPACE_OPERATIONS).toHaveLength(8);
  });

  it('owns every operation for the owner role', () => {
    expect([...PERMISSION_MATRIX.owner].sort()).toEqual([...WORKSPACE_OPERATIONS].sort());
  });

  it.each(
    ALL_ROLES.flatMap((role) =>
      WORKSPACE_OPERATIONS.map((operation) => [role, operation, EXPECTED_MATRIX[role]] as const),
    ),
  )('evaluates %s for %s against the permission matrix', (role, operation, allowed) => {
    expect(can(role, operation)).toBe(allowed.includes(operation));
  });

  it('prevents a viewer from writing elements or managing members', () => {
    expect(can('viewer', 'element:write')).toBe(false);
    expect(can('viewer', 'member:invite')).toBe(false);
    expect(can('viewer', 'member:update-role')).toBe(false);
    expect(can('viewer', 'member:remove')).toBe(false);
  });

  it('allows a viewer to view and leave', () => {
    expect(can('viewer', 'workspace:view')).toBe(true);
    expect(can('viewer', 'member:leave')).toBe(true);
  });

  it('lets an editor write elements and invite, but not manage members or the workspace', () => {
    expect(can('editor', 'element:write')).toBe(true);
    expect(can('editor', 'member:invite')).toBe(true);
    expect(can('editor', 'workspace:update')).toBe(false);
    expect(can('editor', 'workspace:delete')).toBe(false);
    expect(can('editor', 'member:update-role')).toBe(false);
    expect(can('editor', 'member:remove')).toBe(false);
  });

  it('lets an owner perform every operation', () => {
    for (const operation of WORKSPACE_OPERATIONS) {
      expect(can('owner', operation)).toBe(true);
    }
  });

  it('covers every role and operation in the matrix without extras', () => {
    expect(Object.keys(PERMISSION_MATRIX).sort()).toEqual([...ALL_ROLES].sort());
    for (const role of ALL_ROLES) {
      for (const operation of PERMISSION_MATRIX[role]) {
        expect(WORKSPACE_OPERATIONS).toContain(operation);
      }
    }
  });
});
