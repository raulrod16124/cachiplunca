import { can } from '../../domain/membership';
import { UserId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, toAppError, type AppError } from '../../shared/errors';
import type { MembershipRepository, WorkspaceRepository } from '../ports';

export interface DeleteWorkspaceInput {
  readonly id: string;
  readonly actorUserId: string;
}

export type DeleteWorkspaceFieldName = 'id' | 'actorUserId';

export type DeleteWorkspaceFieldErrors = Partial<Record<DeleteWorkspaceFieldName, string>>;

export type DeleteWorkspaceResult =
  | { readonly status: 'ok' }
  | { readonly status: 'invalid-input'; readonly fieldErrors: DeleteWorkspaceFieldErrors }
  | { readonly status: 'error'; readonly error: AppError };

export type DeleteWorkspace = (input: DeleteWorkspaceInput) => Promise<DeleteWorkspaceResult>;

export interface DeleteWorkspaceDeps {
  readonly workspaceRepository: WorkspaceRepository;
  readonly membershipRepository: MembershipRepository;
}

export function validateDeleteWorkspaceInput(
  input: DeleteWorkspaceInput,
): DeleteWorkspaceFieldErrors {
  const fieldErrors: DeleteWorkspaceFieldErrors = {};

  if (input.id.trim().length === 0) {
    fieldErrors.id = 'Enter a workspace id.';
  }

  if (input.actorUserId.trim().length === 0) {
    fieldErrors.actorUserId = 'Enter a user id.';
  }

  return fieldErrors;
}

export function createDeleteWorkspace({
  workspaceRepository,
  membershipRepository,
}: DeleteWorkspaceDeps): DeleteWorkspace {
  return async (input: DeleteWorkspaceInput): Promise<DeleteWorkspaceResult> => {
    const fieldErrors = validateDeleteWorkspaceInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: 'invalid-input', fieldErrors };
    }

    const workspaceId = WorkspaceId.create(input.id);
    const actorUserId = UserId.create(input.actorUserId);

    try {
      const actor = await membershipRepository.findByUserAndWorkspace(actorUserId, workspaceId);

      if (actor === null || !can(actor.role, 'workspace:delete')) {
        return { status: 'error', error: forbiddenError(workspaceId, actorUserId) };
      }

      await workspaceRepository.delete(workspaceId);
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}

function forbiddenError(workspaceId: WorkspaceId, actorUserId: UserId): AppError {
  return createAppError(
    'authorization',
    ERROR_CODES.AUTH_FORBIDDEN,
    'You do not have permission to delete this board.',
    {
      details: {
        workspaceId: workspaceId.value,
        actorUserId: actorUserId.value,
      },
    },
  );
}
