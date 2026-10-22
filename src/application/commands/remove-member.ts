import { can } from '../../domain/membership';
import type { UserId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, toAppError, type AppError } from '../../shared/errors';
import type { MembershipRepository } from '../ports';

export interface RemoveMemberInput {
  readonly workspaceId: WorkspaceId;
  readonly actorUserId: UserId;
  readonly targetUserId: UserId;
}

export type RemoveMemberResult =
  { readonly status: 'ok' } | { readonly status: 'error'; readonly error: AppError };

export type RemoveMember = (input: RemoveMemberInput) => Promise<RemoveMemberResult>;

export function createRemoveMember(membershipRepository: MembershipRepository): RemoveMember {
  return async (input: RemoveMemberInput): Promise<RemoveMemberResult> => {
    try {
      const actor = await membershipRepository.findByUserAndWorkspace(
        input.actorUserId,
        input.workspaceId,
      );

      if (actor === null || !can(actor.role, 'member:remove')) {
        return { status: 'error', error: forbiddenError(input) };
      }

      await membershipRepository.delete(input.targetUserId, input.workspaceId);

      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}

function forbiddenError(input: RemoveMemberInput): AppError {
  return createAppError(
    'authorization',
    ERROR_CODES.AUTH_FORBIDDEN,
    'You do not have permission to remove members from this board.',
    {
      details: {
        workspaceId: input.workspaceId.value,
        actorUserId: input.actorUserId.value,
      },
    },
  );
}
