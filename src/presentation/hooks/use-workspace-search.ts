import { useEffect, useState } from 'react';
import type { ListWorkspaces } from '../../application/queries';
import { matchesSearchText } from '../../application/services';
import type { Workspace } from '../../domain/workspace';

export const WORKSPACE_SEARCH_RESULT_LIMIT = 8;

export type WorkspaceSearchStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseWorkspaceSearchOptions {
  readonly enabled: boolean;
  readonly userId: string | undefined;
  readonly listWorkspaces: ListWorkspaces | undefined;
}

export interface UseWorkspaceSearchResult {
  readonly workspaces: readonly Workspace[];
  readonly status: WorkspaceSearchStatus;
}

export function searchWorkspacesByName(
  workspaces: readonly Workspace[],
  query: string,
  limit = WORKSPACE_SEARCH_RESULT_LIMIT,
): readonly Workspace[] {
  if (limit <= 0) {
    return [];
  }

  return workspaces.filter((workspace) => matchesSearchText(workspace.name, query)).slice(0, limit);
}

export function useWorkspaceSearch({
  enabled,
  userId,
  listWorkspaces,
}: UseWorkspaceSearchOptions): UseWorkspaceSearchResult {
  const [workspaces, setWorkspaces] = useState<readonly Workspace[]>([]);
  const [status, setStatus] = useState<WorkspaceSearchStatus>('idle');

  useEffect(() => {
    if (!enabled || userId === undefined || listWorkspaces === undefined) {
      setWorkspaces([]);
      setStatus('idle');
      return;
    }

    let active = true;
    setStatus('loading');

    void (async () => {
      try {
        const result = await listWorkspaces(userId);

        if (!active) {
          return;
        }

        if (result.status === 'ok') {
          setWorkspaces(result.workspaces);
          setStatus('ready');
          return;
        }

        setWorkspaces([]);
        setStatus('error');
      } catch {
        if (!active) {
          return;
        }

        setWorkspaces([]);
        setStatus('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [enabled, listWorkspaces, userId]);

  return { workspaces, status };
}
