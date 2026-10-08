import type { Workspace } from '../../domain/workspace';
import { toAppError, type AppError } from '../../shared/errors';
import type { WorkspaceRepository } from '../ports';
import { validateWorkspaceName } from './validate-workspace-name';

export interface CreateWorkspaceInput {
  readonly name: string;
  readonly description?: string | null;
}

export type CreateWorkspaceFieldName = 'name';

export type CreateWorkspaceFieldErrors = Partial<Record<CreateWorkspaceFieldName, string>>;

export type CreateWorkspaceResult =
  | { readonly status: 'ok'; readonly workspace: Workspace }
  | { readonly status: 'invalid-input'; readonly fieldErrors: CreateWorkspaceFieldErrors }
  | { readonly status: 'error'; readonly error: AppError };

export type CreateWorkspace = (input: CreateWorkspaceInput) => Promise<CreateWorkspaceResult>;

export function validateCreateWorkspaceInput(
  input: CreateWorkspaceInput,
): CreateWorkspaceFieldErrors {
  const fieldErrors: CreateWorkspaceFieldErrors = {};

  const nameError = validateWorkspaceName(input.name);
  if (nameError !== undefined) {
    fieldErrors.name = nameError;
  }

  return fieldErrors;
}

export function createCreateWorkspace(workspaceRepository: WorkspaceRepository): CreateWorkspace {
  return async (input: CreateWorkspaceInput): Promise<CreateWorkspaceResult> => {
    const fieldErrors = validateCreateWorkspaceInput(input);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: 'invalid-input', fieldErrors };
    }

    try {
      const workspace = await workspaceRepository.create({
        name: input.name.trim(),
        description: input.description,
      });
      return { status: 'ok', workspace };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
