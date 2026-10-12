import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PresencePort } from '../../../application/ports';
import type { LogoutUser } from '../../../application/commands';
import type { GetWorkspace, LoadWorkspaceElements } from '../../../application/queries';
import type {
  ElementPersistenceOrchestrator,
  RealtimeSubscriptionManager,
} from '../../../application/services';
import type { ElementId } from '../../../domain/shared';
import { useSession } from '../../../app/providers/session-provider';
import { WorkspaceShellContainer } from './components/workspace-shell-container';

export interface WorkspaceShellPageProps {
  readonly getWorkspace: GetWorkspace;
  readonly loadWorkspaceElements: LoadWorkspaceElements;
  readonly elementPersistenceOrchestrator: ElementPersistenceOrchestrator;
  readonly realtimeSubscriptionManager: RealtimeSubscriptionManager;
  readonly generateElementId: () => ElementId;
  readonly logoutUser: LogoutUser;
  readonly presencePort?: PresencePort;
}

export function WorkspaceShellPage({
  getWorkspace,
  loadWorkspaceElements,
  elementPersistenceOrchestrator,
  realtimeSubscriptionManager,
  generateElementId,
  logoutUser,
  presencePort,
}: WorkspaceShellPageProps): ReactNode {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const session = useSession();

  if (workspaceId === undefined || workspaceId.length === 0) {
    return null;
  }

  const localUserId = session.status === 'authenticated' ? session.user.uid : undefined;

  return (
    <WorkspaceShellContainer
      workspaceId={workspaceId}
      getWorkspace={getWorkspace}
      loadWorkspaceElements={loadWorkspaceElements}
      elementPersistenceOrchestrator={elementPersistenceOrchestrator}
      realtimeSubscriptionManager={realtimeSubscriptionManager}
      generateElementId={generateElementId}
      logoutUser={logoutUser}
      presencePort={presencePort}
      localUserId={localUserId}
      onBack={() => navigate('/workspaces')}
    />
  );
}
