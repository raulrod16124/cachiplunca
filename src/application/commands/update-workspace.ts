import { WorkspaceId } from '../../domain/shared';
import type { Workspace } from '../../domain/workspace';
import { toAppError, type AppError } from '../../shared/errors';
import type { WorkspaceRepository, WorkspaceUpdateInput } from '../ports';
import { validateWorkspaceName } from './validate-workspace-name';

export interface UpdateWorkspaceInput {
  readonly id: string;
  readonly name?: string;
  readonly description?: string | null;
}

export type UpdateWorkspaceFieldName = 'id' | 'name' | 'form';

export type UpdateWorkspaceFieldErrors = Partial<Record<UpdateWorkspaceFieldName, string>>;

export type UpdateWorkspaceResult =
  | { readonly status: 'ok'; readonly workspace: Workspace }
  | { readonly status: 'invalid-input'; readonly fieldErrors: UpdateWorkspaceFieldErrors }
  | { readonly status: 'error'; readonly error: AppError };

export type UpdateWorkspace = (input: UpdateWorkspaceInput) => Promise<UpdateWorkspaceResult>;

export function validateUpdateWorkspaceInput(
  input: UpdateWorkspaceInput,
): UpdateWorkspaceFieldErrors {
  const fieldErrors: UpdateWorkspaceFieldErrors = {};

  if (input.id.trim().length === 0) {
    fieldErrors.id = 'Enter a workspace id.';
  }

  if (input.name !== undefined) {
    const nameError = validateWorkspaceName(input.name);
    if (nameError !== undefined) {
      fieldErrors.name = nameError;
    }
  }

  if (input.name === undefined && input.description === undefined) {
    fieldErrors.form = 'Provide at least one field to update.';
  }

  return fieldErrors;
}

export function createUpdateWorkspace(workspaceRepository: WorkspaceRepository): UpdateWorkspace {
  return async (input: UpdateWorkspaceInput): Promise<UpdateWorkspaceResult> => {
    const fieldErrors = validateUpdateWorkspaceInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: 'invalid-input', fieldErrors };
    }

    try {
      const updates: WorkspaceUpdateInput = {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      };

      const workspace = await workspaceRepository.update(WorkspaceId.create(input.id), updates);
      return { status: 'ok', workspace };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
