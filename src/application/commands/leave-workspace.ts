import { can } from '../../domain/membership';
import type { UserId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, toAppError, type AppError } from '../../shared/errors';
import type { MembershipRepository } from '../ports';

export interface LeaveWorkspaceInput {
  readonly workspaceId: WorkspaceId;
  readonly userId: UserId;
}

export type LeaveWorkspaceResult =
  { readonly status: 'ok' } | { readonly status: 'error'; readonly error: AppError };

export type LeaveWorkspace = (input: LeaveWorkspaceInput) => Promise<LeaveWorkspaceResult>;

export function createLeaveWorkspace(membershipRepository: MembershipRepository): LeaveWorkspace {
  return async (input: LeaveWorkspaceInput): Promise<LeaveWorkspaceResult> => {
    try {
      const membership = await membershipRepository.findByUserAndWorkspace(
        input.userId,
        input.workspaceId,
      );

      if (membership === null || !can(membership.role, 'member:leave')) {
        return { status: 'error', error: forbiddenError(input) };
      }

      await membershipRepository.delete(input.userId, input.workspaceId);

      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}

function forbiddenError(input: LeaveWorkspaceInput): AppError {
  return createAppError(
    'authorization',
    ERROR_CODES.AUTH_FORBIDDEN,
    'You do not have permission to leave this workspace.',
    {
      details: {
        workspaceId: input.workspaceId.value,
        userId: input.userId.value,
      },
    },
  );
}
