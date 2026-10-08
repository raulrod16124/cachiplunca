import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type {
  ListWorkspaces,
  ListWorkspacesResult,
} from '../../../../application/queries/list-workspaces';
import { WorkspacesList } from './workspaces-list';

export interface WorkspacesListContainerProps {
  readonly listWorkspaces: ListWorkspaces;
  readonly onCreateWorkspace: () => void;
}

export function WorkspacesListContainer({
  listWorkspaces,
  onCreateWorkspace,
}: WorkspacesListContainerProps): ReactNode {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ListWorkspacesResult | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    setStatus('loading');
    const response = await listWorkspaces();
    setResult(response);

    if (response.status === 'ok') {
      setStatus('success');
      return;
    }

    setStatus('error');
  }, [listWorkspaces]);

  useEffect(() => {
    void fetchWorkspaces();
  }, [fetchWorkspaces]);

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
