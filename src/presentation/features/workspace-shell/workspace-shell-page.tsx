import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { FileDownloadPort, PresencePort } from '../../../application/ports';
import type {
  ChangeMemberRole,
  InviteMember,
  LeaveWorkspace,
  LogoutUser,
  RemoveMember,
  UpdateWorkspace,
} from '../../../application/commands';
import type {
  GetWorkspace,
  GetWorkspaceRole,
  ListPendingInvitations,
  ListWorkspaceMembers,
  LoadWorkspaceElements,
} from '../../../application/queries';
import type {
  ElementPersistenceOrchestrator,
  RealtimeSubscriptionManager,
} from '../../../application/services';
import type { ElementId } from '../../../domain/shared';
import { useSession } from '../../providers/session-provider';
import { WorkspaceShellContainer } from './components/workspace-shell-container';

export interface WorkspaceShellPageProps {
  readonly getWorkspace: GetWorkspace;
  readonly loadWorkspaceElements: LoadWorkspaceElements;
  readonly elementPersistenceOrchestrator: ElementPersistenceOrchestrator;
  readonly realtimeSubscriptionManager: RealtimeSubscriptionManager;
  readonly generateElementId: () => ElementId;
  readonly logoutUser: LogoutUser;
  readonly presencePort?: PresencePort;
  readonly inviteMember?: InviteMember;
  readonly listPendingInvitations?: ListPendingInvitations;
  readonly getWorkspaceRole?: GetWorkspaceRole;
  readonly listWorkspaceMembers?: ListWorkspaceMembers;
  readonly changeMemberRole?: ChangeMemberRole;
  readonly removeMember?: RemoveMember;
  readonly leaveWorkspace?: LeaveWorkspace;
  readonly updateWorkspace?: UpdateWorkspace;
  readonly fileDownload?: FileDownloadPort;
}

export function WorkspaceShellPage({
  getWorkspace,
  loadWorkspaceElements,
  elementPersistenceOrchestrator,
  realtimeSubscriptionManager,
  generateElementId,
  logoutUser,
  presencePort,
  inviteMember,
  listPendingInvitations,
  getWorkspaceRole,
  listWorkspaceMembers,
  changeMemberRole,
  removeMember,
  leaveWorkspace,
  updateWorkspace,
  fileDownload,
}: WorkspaceShellPageProps): ReactNode {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const session = useSession();

  if (workspaceId === undefined || workspaceId.length === 0) {
    return null;
  }

  const localUserId = session.status === 'authenticated' ? session.user.uid : undefined;
  const currentUser = session.status === 'authenticated' ? session.user : null;

  return (
    <WorkspaceShellContainer
      workspaceId={workspaceId}
      getWorkspace={getWorkspace}
      loadWorkspaceElements={loadWorkspaceElements}
      elementPersistenceOrchestrator={elementPersistenceOrchestrator}
      realtimeSubscriptionManager={realtimeSubscriptionManager}
      generateElementId={generateElementId}
      logoutUser={logoutUser}
      currentUser={currentUser}
      presencePort={presencePort}
      localUserId={localUserId}
      inviteMember={inviteMember}
      listPendingInvitations={listPendingInvitations}
      getWorkspaceRole={getWorkspaceRole}
      listWorkspaceMembers={listWorkspaceMembers}
      changeMemberRole={changeMemberRole}
      removeMember={removeMember}
      leaveWorkspace={leaveWorkspace}
      updateWorkspace={updateWorkspace}
      fileDownload={fileDownload}
      onBack={() => navigate('/workspaces')}
    />
  );
}
