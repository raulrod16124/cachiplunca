import { WorkspaceId } from '../../domain/shared';
import { toAppError, type AppError } from '../../shared/errors';
import type { WorkspaceRepository } from '../ports';

export interface DeleteWorkspaceInput {
  readonly id: string;
}

export type DeleteWorkspaceFieldName = 'id';

export type DeleteWorkspaceFieldErrors = Partial<Record<DeleteWorkspaceFieldName, string>>;

export type DeleteWorkspaceResult =
  | { readonly status: 'ok' }
  | { readonly status: 'invalid-input'; readonly fieldErrors: DeleteWorkspaceFieldErrors }
  | { readonly status: 'error'; readonly error: AppError };

export type DeleteWorkspace = (input: DeleteWorkspaceInput) => Promise<DeleteWorkspaceResult>;

export function validateDeleteWorkspaceInput(
  input: DeleteWorkspaceInput,
): DeleteWorkspaceFieldErrors {
  const fieldErrors: DeleteWorkspaceFieldErrors = {};

  if (input.id.trim().length === 0) {
    fieldErrors.id = 'Enter a workspace id.';
  }

  return fieldErrors;
}

export function createDeleteWorkspace(workspaceRepository: WorkspaceRepository): DeleteWorkspace {
  return async (input: DeleteWorkspaceInput): Promise<DeleteWorkspaceResult> => {
    const fieldErrors = validateDeleteWorkspaceInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: 'invalid-input', fieldErrors };
    }

    try {
      await workspaceRepository.delete(WorkspaceId.create(input.id));
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
