import { useCallback, useMemo } from 'react';
import {
  can as canPerform,
  type MembershipRole,
  type WorkspaceOperation,
} from '../../domain/membership';

export interface WorkspacePermissions {
  readonly role: MembershipRole | undefined;
  readonly can: (operation: WorkspaceOperation) => boolean;
}

export function useWorkspacePermissions(role: MembershipRole | undefined): WorkspacePermissions {
  const can = useCallback(
    (operation: WorkspaceOperation): boolean =>
      role === undefined ? false : canPerform(role, operation),
    [role],
  );

  return useMemo(() => ({ role, can }), [role, can]);
}
