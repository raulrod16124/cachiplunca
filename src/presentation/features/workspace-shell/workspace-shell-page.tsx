import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { LogoutUser } from '../../../application/commands';
import type { GetWorkspace, LoadWorkspaceElements } from '../../../application/queries';
import type { ElementPersistenceOrchestrator } from '../../../application/services';
import type { ElementId } from '../../../domain/shared';
import { WorkspaceShellContainer } from './components/workspace-shell-container';

export interface WorkspaceShellPageProps {
  readonly getWorkspace: GetWorkspace;
  readonly loadWorkspaceElements: LoadWorkspaceElements;
  readonly elementPersistenceOrchestrator: ElementPersistenceOrchestrator;
  readonly generateElementId: () => ElementId;
  readonly logoutUser: LogoutUser;
}

export function WorkspaceShellPage({
  getWorkspace,
  loadWorkspaceElements,
  elementPersistenceOrchestrator,
  generateElementId,
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
      elementPersistenceOrchestrator={elementPersistenceOrchestrator}
      generateElementId={generateElementId}
      logoutUser={logoutUser}
      onBack={() => navigate('/workspaces')}
    />
  );
}
