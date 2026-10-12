import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { LogoutUser } from '../../../application/commands';
import type { GetWorkspace, LoadWorkspaceElements } from '../../../application/queries';
import { WorkspaceShellContainer } from './components/workspace-shell-container';

export interface WorkspaceShellPageProps {
  readonly getWorkspace: GetWorkspace;
  readonly loadWorkspaceElements: LoadWorkspaceElements;
  readonly logoutUser: LogoutUser;
}

export function WorkspaceShellPage({
  getWorkspace,
  loadWorkspaceElements,
  logoutUser,
}: WorkspaceShellPageProps): ReactNode {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  if (workspaceId === undefined || workspaceId.length === 0) {
    return null;
  }

  return (
    <WorkspaceShellContainer
      workspaceId={workspaceId}
      getWorkspace={getWorkspace}
      loadWorkspaceElements={loadWorkspaceElements}
      logoutUser={logoutUser}
      onBack={() => navigate('/workspaces')}
    />
  );
}
