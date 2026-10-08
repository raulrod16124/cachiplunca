import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type {
  ListWorkspaces,
  ListWorkspacesResult,
} from '../../../../application/queries/list-workspaces';
import { toAppError } from '../../../../shared/errors';
import { WorkspacesList } from './workspaces-list';

export interface WorkspacesListContainerProps {
  readonly listWorkspaces: ListWorkspaces;
  readonly onCreateWorkspace: () => void;
  readonly refreshToken?: number;
}

export function WorkspacesListContainer({
  listWorkspaces,
  onCreateWorkspace,
  refreshToken = 0,
}: WorkspacesListContainerProps): ReactNode {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ListWorkspacesResult | null>(null);

  const fetchWorkspaces = useCallback(async (): Promise<void> => {
    setStatus('loading');
    try {
      const response = await listWorkspaces();
      setResult(response);
      setStatus(response.status === 'ok' ? 'success' : 'error');
    } catch (error) {
      setResult({ status: 'error', error: toAppError(error) });
      setStatus('error');
    }
  }, [listWorkspaces]);

  useEffect(() => {
    void fetchWorkspaces();
  }, [fetchWorkspaces, refreshToken]);

  const errorMessage = result?.status === 'error' ? result.error.message : undefined;
  const workspaces = result?.status === 'ok' ? result.workspaces : [];

  return (
    <WorkspacesList
      status={status}
      workspaces={workspaces}
      errorMessage={errorMessage}
      onRetry={fetchWorkspaces}
      onCreate={onCreateWorkspace}
    />
  );
}
