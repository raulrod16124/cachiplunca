import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type {
  AcceptInvitation,
  CreateWorkspaceWithOwner,
  InviteMember,
  LoginUser,
  LogoutUser,
  RegisterUser,
} from '../../application/commands';
import type {
  GetWorkspace,
  GetWorkspaceRole,
  ListPendingInvitations,
  ListWorkspaces,
  LoadWorkspaceElements,
} from '../../application/queries';
import type { PresencePort } from '../../application/ports';
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
  readonly listWorkspaces: ListWorkspaces;
  readonly createWorkspaceWithOwner: CreateWorkspaceWithOwner;
  readonly getWorkspace: GetWorkspace;
  readonly loadWorkspaceElements: LoadWorkspaceElements;
  readonly elementPersistenceOrchestrator: ElementPersistenceOrchestrator;
  readonly realtimeSubscriptionManager: RealtimeSubscriptionManager;
  readonly generateElementId: () => ElementId;
  readonly presencePort?: PresencePort;
  readonly inviteMember?: InviteMember;
  readonly listPendingInvitations?: ListPendingInvitations;
  readonly acceptInvitation?: AcceptInvitation;
  readonly getWorkspaceRole?: GetWorkspaceRole;
}

export function AppRoutes({
  registerUser,
  loginUser,
  logoutUser,
  listWorkspaces,
  createWorkspaceWithOwner,
  getWorkspace,
  loadWorkspaceElements,
  elementPersistenceOrchestrator,
  realtimeSubscriptionManager,
  generateElementId,
  presencePort,
  inviteMember,
  listPendingInvitations,
  acceptInvitation,
  getWorkspaceRole,
}: AppRoutesProps): ReactNode {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/register" replace />} />
      {acceptInvitation !== undefined && (
        <Route
          path="/invitations/:token"
          element={<AcceptInvitationPage acceptInvitation={acceptInvitation} />}
        />
      )}
      <Route element={<RequireAnonymous />}>
        <Route path="/login" element={<LoginPage loginUser={loginUser} />} />
        <Route path="/register" element={<RegisterPage registerUser={registerUser} />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route
          path="/workspaces"
          element={
            <WorkspacesPage
              logoutUser={logoutUser}
              listWorkspaces={listWorkspaces}
              createWorkspaceWithOwner={createWorkspaceWithOwner}
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
            />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
