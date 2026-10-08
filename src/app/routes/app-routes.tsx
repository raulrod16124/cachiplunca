import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type {
  CreateWorkspace,
  LoginUser,
  LogoutUser,
  RegisterUser,
} from '../../application/commands';
import type { GetWorkspace, ListWorkspaces } from '../../application/queries';
import { LoginPage } from '../../presentation/features/auth/login-page';
import { RegisterPage } from '../../presentation/features/auth/register-page';
import { WorkspaceShellPage } from '../../presentation/features/workspace-shell';
import { WorkspacesPage } from '../../presentation/features/workspaces/workspaces-page';
import { RequireAnonymous } from './require-anonymous';
import { RequireAuth } from './require-auth';

export interface AppRoutesProps {
  readonly registerUser: RegisterUser;
  readonly loginUser: LoginUser;
  readonly logoutUser: LogoutUser;
  readonly listWorkspaces: ListWorkspaces;
  readonly createWorkspace: CreateWorkspace;
  readonly getWorkspace: GetWorkspace;
}

export function AppRoutes({
  registerUser,
  loginUser,
  logoutUser,
  listWorkspaces,
  createWorkspace,
  getWorkspace,
}: AppRoutesProps): ReactNode {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/register" replace />} />
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
              createWorkspace={createWorkspace}
            />
          }
        />
        <Route
          path="/workspaces/:workspaceId"
          element={<WorkspaceShellPage getWorkspace={getWorkspace} logoutUser={logoutUser} />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
