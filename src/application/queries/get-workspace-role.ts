import type { MembershipRole } from '../../domain/membership';
import { UserId, WorkspaceId } from '../../domain/shared';
import { toAppError, type AppError } from '../../shared/errors';
import type { MembershipRepository } from '../ports';

export type GetWorkspaceRoleResult =
  | { readonly status: 'ok'; readonly role: MembershipRole }
  | { readonly status: 'notFound' }
  | { readonly status: 'error'; readonly error: AppError };

export type GetWorkspaceRole = (
  userId: string,
  workspaceId: string,
) => Promise<GetWorkspaceRoleResult>;

export function createGetWorkspaceRole(
  membershipRepository: MembershipRepository,
): GetWorkspaceRole {
  return async (userId: string, workspaceId: string): Promise<GetWorkspaceRoleResult> => {
    try {
      const membership = await membershipRepository.findByUserAndWorkspace(
        UserId.create(userId),
        WorkspaceId.create(workspaceId),
      );

      if (membership === null) {
        return { status: 'notFound' };
      }

      return { status: 'ok', role: membership.role };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
