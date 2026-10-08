import { WorkspaceId } from '../../domain/shared';
import type { Workspace } from '../../domain/workspace';
import { toAppError, type AppError } from '../../shared/errors';
import type { WorkspaceRepository } from '../ports';

export type GetWorkspaceResult =
  | { readonly status: 'ok'; readonly workspace: Workspace }
  | { readonly status: 'notFound' }
  | { readonly status: 'error'; readonly error: AppError };

export type GetWorkspace = (id: string) => Promise<GetWorkspaceResult>;

export function createGetWorkspace(workspaceRepository: WorkspaceRepository): GetWorkspace {
  return async (id: string): Promise<GetWorkspaceResult> => {
    try {
      const workspace = await workspaceRepository.findById(WorkspaceId.create(id));
      if (workspace === null) {
        return { status: 'notFound' };
      }
      return { status: 'ok', workspace };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
