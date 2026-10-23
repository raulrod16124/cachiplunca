import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { FileDownloadPort, PresencePort } from '../../../application/ports';
import type { CommentServices } from '../../../application/comment-services';
import type { GuestLinkServices } from '../../../application/guest-link-services';
import type { ImageServices } from '../../../application/image-services';
import type {
  ChangeMemberRole,
  InviteMember,
  LeaveWorkspace,
  LogoutUser,
  RemoveMember,
} from '../../../application/commands';
import type {
  GetWorkspace,
  GetWorkspaceRole,
  ListPendingInvitations,
  ListWorkspaceMembers,
  ListWorkspaces,
  LoadWorkspaceElements,
} from '../../../application/queries';
import type {
  ElementPersistenceOrchestrator,
  RealtimeSubscriptionManager,
} from '../../../application/services';
import type { ElementId } from '../../../domain/shared';
import { useSession } from '../../providers/session-provider';
import {
  WorkspaceShellContainer,
  type CommentTarget,
} from './components/workspace-shell-container';

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
  readonly fileDownload?: FileDownloadPort;
  readonly listWorkspaces?: ListWorkspaces;
  readonly comments?: CommentServices;
  readonly imageServices?: ImageServices;
  readonly guestLinks?: GuestLinkServices;
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
  fileDownload,
  listWorkspaces,
  comments,
  imageServices,
  guestLinks,
}: WorkspaceShellPageProps): ReactNode {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const session = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(null);

  useEffect(() => {
    const elementId = searchParams.get('elementId');
    const commentId = searchParams.get('commentId');

    if (elementId !== null && elementId.length > 0 && commentId !== null && commentId.length > 0) {
      setCommentTarget({ elementId, commentId });
    }
  }, [searchParams]);

  const handleCommentTargetHandled = useCallback((): void => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete('elementId');
        next.delete('commentId');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

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
      fileDownload={fileDownload}
      listWorkspaces={listWorkspaces}
      comments={comments}
      commentTarget={commentTarget}
      onCommentTargetHandled={handleCommentTargetHandled}
      imageServices={imageServices}
      guestLinks={guestLinks}
      onOpenWorkspace={(nextWorkspaceId) => navigate(`/workspaces/${nextWorkspaceId}`)}
      onBack={() => navigate('/workspaces')}
    />
  );
}
