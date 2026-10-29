import { WorkspaceId } from '../../domain/shared';
import type { Workspace, WorkspaceType } from '../../domain/workspace';
import { toAppError, type AppError } from '../../shared/errors';
import type { WorkspaceRepository, WorkspaceUpdateInput } from '../ports';
import { validateWorkspaceName } from './validate-workspace-name';

export interface UpdateWorkspaceInput {
  readonly id: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly coverImageUrl?: string | null;
  readonly coverImageStoragePath?: string | null;
  readonly type?: WorkspaceType;
}

export type UpdateWorkspaceFieldName = 'id' | 'name' | 'cover' | 'form';

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

  const hasCoverUrl = input.coverImageUrl !== undefined;
  const hasCoverPath = input.coverImageStoragePath !== undefined;

  if (hasCoverUrl !== hasCoverPath) {
    fieldErrors.cover = 'Provide both cover image URL and storage path.';
  }

  if (
    input.name === undefined &&
    input.description === undefined &&
    input.type === undefined &&
    !hasCoverUrl &&
    !hasCoverPath
  ) {
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
        ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl } : {}),
        ...(input.coverImageStoragePath !== undefined
          ? { coverImageStoragePath: input.coverImageStoragePath }
          : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
      };

      const workspace = await workspaceRepository.update(WorkspaceId.create(input.id), updates);
      return { status: 'ok', workspace };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
