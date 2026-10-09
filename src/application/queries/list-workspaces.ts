import type { Workspace } from '../../domain/workspace';
import { toAppError, type AppError } from '../../shared/errors';
import type { WorkspaceRepository } from '../ports';

export type ListWorkspacesResult =
  | { readonly status: 'ok'; readonly workspaces: Workspace[] }
  | { readonly status: 'error'; readonly error: AppError };

export type ListWorkspaces = () => Promise<ListWorkspacesResult>;

export function sortWorkspacesForList(workspaces: readonly Workspace[]): Workspace[] {
  return [...workspaces].sort(compareWorkspacesForList);
}

function compareWorkspacesForList(a: Workspace, b: Workspace): number {
  const updatedDiff = b.updatedAt.getTime() - a.updatedAt.getTime();
  if (updatedDiff !== 0) {
    return updatedDiff;
  }

  const createdDiff = b.createdAt.getTime() - a.createdAt.getTime();
  if (createdDiff !== 0) {
    return createdDiff;
  }

  if (a.id.value === b.id.value) {
    return 0;
  }
  return a.id.value < b.id.value ? -1 : 1;
}

export function createListWorkspaces(workspaceRepository: WorkspaceRepository): ListWorkspaces {
  return async (): Promise<ListWorkspacesResult> => {
    try {
      const workspaces = await workspaceRepository.list();
      return { status: 'ok', workspaces: sortWorkspacesForList(workspaces) };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
