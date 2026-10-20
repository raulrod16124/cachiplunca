import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type {
  AcceptInvitation,
  AcceptInvitationById,
  ChangeMemberRole,
  CreateWorkspaceWithOwner,
  DeleteWorkspace,
  DuplicateWorkspace,
  InviteMember,
  LeaveWorkspace,
  LoginUser,
  LogoutUser,
  RefreshUser,
  RegisterUser,
  RemoveMember,
  SendEmailVerification,
  UpdateWorkspace,
} from '../../application/commands';
import type {
  GetWorkspace,
  GetWorkspaceRole,
  ListPendingInvitations,
  ListPendingInvitationsForUser,
  ListWorkspaceMembers,
  ListWorkspaces,
  LoadWorkspaceElements,
} from '../../application/queries';
import type { FileDownloadPort, PresencePort } from '../../application/ports';
import type { CommentServices } from '../../application/comment-services';
import type { ImageServices } from '../../application/image-services';
import type {
  ElementPersistenceOrchestrator,
  RealtimeSubscriptionManager,
} from '../../application/services';
import type { ElementId } from '../../domain/shared';
import { LoginPage } from '../../presentation/features/auth/login-page';
import { RegisterPage } from '../../presentation/features/auth/register-page';
import { AcceptInvitationPage } from '../../presentation/features/invitations';
import { WorkspaceShellPage } from '../../presentation/features/workspace-shell';
import { WorkspacesPage } from '../../presentation/features/workspaces/workspaces-page';
import { RequireAnonymous } from './require-anonymous';
import { RequireAuth } from './require-auth';

export interface AppRoutesProps {
  readonly registerUser: RegisterUser;
  readonly loginUser: LoginUser;
  readonly logoutUser: LogoutUser;
  readonly sendEmailVerification?: SendEmailVerification;
  readonly refreshUser?: RefreshUser;
  readonly listWorkspaces: ListWorkspaces;
  readonly createWorkspaceWithOwner: CreateWorkspaceWithOwner;
  readonly deleteWorkspace?: DeleteWorkspace;
  readonly duplicateWorkspace?: DuplicateWorkspace;
  readonly getWorkspace: GetWorkspace;
  readonly loadWorkspaceElements: LoadWorkspaceElements;
  readonly elementPersistenceOrchestrator: ElementPersistenceOrchestrator;
  readonly realtimeSubscriptionManager: RealtimeSubscriptionManager;
  readonly generateElementId: () => ElementId;
  readonly presencePort?: PresencePort;
  readonly inviteMember?: InviteMember;
  readonly listPendingInvitations?: ListPendingInvitations;
  readonly listPendingInvitationsForUser?: ListPendingInvitationsForUser;
  readonly acceptInvitation?: AcceptInvitation;
  readonly acceptInvitationById?: AcceptInvitationById;
  readonly getWorkspaceRole?: GetWorkspaceRole;
  readonly listWorkspaceMembers?: ListWorkspaceMembers;
  readonly changeMemberRole?: ChangeMemberRole;
  readonly removeMember?: RemoveMember;
  readonly leaveWorkspace?: LeaveWorkspace;
  readonly updateWorkspace?: UpdateWorkspace;
  readonly fileDownload?: FileDownloadPort;
  readonly comments?: CommentServices;
  readonly imageServices?: ImageServices;
}

export function AppRoutes({
  registerUser,
  loginUser,
  logoutUser,
  sendEmailVerification,
  refreshUser,
  listWorkspaces,
  createWorkspaceWithOwner,
  deleteWorkspace,
  duplicateWorkspace,
  getWorkspace,
  loadWorkspaceElements,
  elementPersistenceOrchestrator,
  realtimeSubscriptionManager,
  generateElementId,
  presencePort,
  inviteMember,
  listPendingInvitations,
  listPendingInvitationsForUser,
  acceptInvitation,
  acceptInvitationById,
  getWorkspaceRole,
  listWorkspaceMembers,
  changeMemberRole,
  removeMember,
  leaveWorkspace,
  updateWorkspace,
  fileDownload,
  comments,
  imageServices,
}: AppRoutesProps): ReactNode {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/register" replace />} />
      {acceptInvitation !== undefined && (
        <Route
          path="/invitations/:token"
          element={
            <AcceptInvitationPage
              acceptInvitation={acceptInvitation}
              sendEmailVerification={sendEmailVerification}
              refreshUser={refreshUser}
            />
          }
        />
      )}
      <Route element={<RequireAnonymous />}>
        <Route path="/login" element={<LoginPage loginUser={loginUser} />} />
        <Route
          path="/register"
          element={
            <RegisterPage
              registerUser={registerUser}
              sendEmailVerification={sendEmailVerification}
            />
          }
        />
      </Route>
      <Route element={<RequireAuth />}>
        <Route
          path="/workspaces"
          element={
            <WorkspacesPage
              logoutUser={logoutUser}
              listWorkspaces={listWorkspaces}
              createWorkspaceWithOwner={createWorkspaceWithOwner}
              deleteWorkspace={deleteWorkspace}
              duplicateWorkspace={duplicateWorkspace}
              updateWorkspace={updateWorkspace}
              listPendingInvitationsForUser={listPendingInvitationsForUser}
              acceptInvitationById={acceptInvitationById}
              sendEmailVerification={sendEmailVerification}
              refreshUser={refreshUser}
            />
          }
        />
        <Route
          path="/workspaces/:workspaceId"
          element={
            <WorkspaceShellPage
              getWorkspace={getWorkspace}
              loadWorkspaceElements={loadWorkspaceElements}
              elementPersistenceOrchestrator={elementPersistenceOrchestrator}
              realtimeSubscriptionManager={realtimeSubscriptionManager}
              generateElementId={generateElementId}
              logoutUser={logoutUser}
              presencePort={presencePort}
              inviteMember={inviteMember}
              listPendingInvitations={listPendingInvitations}
              getWorkspaceRole={getWorkspaceRole}
              listWorkspaceMembers={listWorkspaceMembers}
              changeMemberRole={changeMemberRole}
              removeMember={removeMember}
              leaveWorkspace={leaveWorkspace}
              updateWorkspace={updateWorkspace}
              fileDownload={fileDownload}
              listWorkspaces={listWorkspaces}
              comments={comments}
              imageServices={imageServices}
            />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
