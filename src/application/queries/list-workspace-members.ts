import type { Membership, MembershipRole } from '../../domain/membership';
import { WorkspaceId } from '../../domain/shared';
import { toAppError, type AppError } from '../../shared/errors';
import type { MembershipRepository } from '../ports';

export type ListWorkspaceMembersResult =
  | { readonly status: 'ok'; readonly members: Membership[] }
  | { readonly status: 'error'; readonly error: AppError };

export type ListWorkspaceMembers = (workspaceId: string) => Promise<ListWorkspaceMembersResult>;

const ROLE_ORDER: Record<MembershipRole, number> = {
  owner: 0,
  editor: 1,
  viewer: 2,
};

export function sortWorkspaceMembers(members: readonly Membership[]): Membership[] {
  return [...members].sort(compareWorkspaceMembers);
}

function compareWorkspaceMembers(a: Membership, b: Membership): number {
  const roleDiff = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
  if (roleDiff !== 0) {
    return roleDiff;
  }

  if (a.userId.value === b.userId.value) {
    return 0;
  }
  return a.userId.value < b.userId.value ? -1 : 1;
}

export function createListWorkspaceMembers(
  membershipRepository: MembershipRepository,
): ListWorkspaceMembers {
  return async (workspaceId: string): Promise<ListWorkspaceMembersResult> => {
    try {
      const members = await membershipRepository.listByWorkspace(WorkspaceId.create(workspaceId));
      return { status: 'ok', members: sortWorkspaceMembers(members) };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
