import type { UserId } from '../../domain/shared';
import type { Workspace } from '../../domain/workspace';
import { createAppError, toAppError, type AppError } from '../../shared/errors';
import type { WorkspaceRepository } from '../ports';
import { validateCreateWorkspaceInput, type CreateWorkspaceFieldErrors } from './create-workspace';
import type { CreateOwnerMembership } from './create-owner-membership';

export interface CreateWorkspaceWithOwnerInput {
  readonly name: string;
  readonly description?: string | null;
  readonly ownerId: UserId;
}

export type CreateWorkspaceWithOwnerResult =
  | { readonly status: 'ok'; readonly workspace: Workspace }
  | { readonly status: 'invalid-input'; readonly fieldErrors: CreateWorkspaceFieldErrors }
  | { readonly status: 'error'; readonly error: AppError };

export type CreateWorkspaceWithOwner = (
  input: CreateWorkspaceWithOwnerInput,
) => Promise<CreateWorkspaceWithOwnerResult>;

export interface CreateWorkspaceWithOwnerDeps {
  readonly workspaceRepository: WorkspaceRepository;
  readonly createOwnerMembership: CreateOwnerMembership;
}

export function createCreateWorkspaceWithOwner(
  deps: CreateWorkspaceWithOwnerDeps,
): CreateWorkspaceWithOwner {
  return async (input: CreateWorkspaceWithOwnerInput): Promise<CreateWorkspaceWithOwnerResult> => {
    const fieldErrors = validateCreateWorkspaceInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: 'invalid-input', fieldErrors };
    }

    let workspace: Workspace;
    try {
      workspace = await deps.workspaceRepository.create({
        name: input.name.trim(),
        createdBy: input.ownerId,
        description: input.description,
      });
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }

    const ownerResult = await deps.createOwnerMembership({
      userId: input.ownerId,
      workspaceId: workspace.id,
    });
    if (ownerResult.status === 'ok') {
      return { status: 'ok', workspace };
    }

    try {
      await deps.workspaceRepository.delete(workspace.id);
    } catch (compensationError) {
      return {
        status: 'error',
        error: annotateCompensationFailure(ownerResult.error, compensationError),
      };
    }

    return { status: 'error', error: ownerResult.error };
  };
}

function annotateCompensationFailure(error: AppError, cause: unknown): AppError {
  return createAppError(error.kind, error.code, error.message, {
    details: { ...error.details, workspaceRollbackFailed: true },
    cause,
  });
}
