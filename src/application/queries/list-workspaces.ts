import type { Workspace } from '../../domain/workspace';
import { UserId } from '../../domain/shared';
import { toAppError, type AppError } from '../../shared/errors';
import type { MembershipRepository, WorkspaceRepository } from '../ports';

export type ListWorkspacesResult =
  | { readonly status: 'ok'; readonly workspaces: Workspace[] }
  | { readonly status: 'error'; readonly error: AppError };

export type ListWorkspaces = (userId: string) => Promise<ListWorkspacesResult>;

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

export function createListWorkspaces(
  workspaceRepository: WorkspaceRepository,
  membershipRepository: MembershipRepository,
): ListWorkspaces {
  return async (userId: string): Promise<ListWorkspacesResult> => {
    try {
      const memberships = await membershipRepository.listByUser(UserId.create(userId));
      const resolved = await Promise.all(
        memberships.map((membership) => workspaceRepository.findById(membership.workspaceId)),
      );

      const unique = new Map<string, Workspace>();
      for (const workspace of resolved) {
        if (workspace !== null) {
          unique.set(workspace.id.value, workspace);
        }
      }

      return { status: 'ok', workspaces: sortWorkspacesForList([...unique.values()]) };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
