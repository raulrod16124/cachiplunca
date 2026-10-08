import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { LoginUser, LogoutUser, RegisterUser } from '../../application/commands';
import type { ListWorkspaces } from '../../application/queries/list-workspaces';
import { LoginPage } from '../../presentation/features/auth/login-page';
import { RegisterPage } from '../../presentation/features/auth/register-page';
import { WorkspacesPage } from '../../presentation/features/workspaces/workspaces-page';
import { RequireAnonymous } from './require-anonymous';
import { RequireAuth } from './require-auth';

export interface AppRoutesProps {
  readonly registerUser: RegisterUser;
  readonly loginUser: LoginUser;
  readonly logoutUser: LogoutUser;
  readonly listWorkspaces: ListWorkspaces;
}

export function AppRoutes({
  registerUser,
  loginUser,
  logoutUser,
  listWorkspaces,
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
          element={<WorkspacesPage logoutUser={logoutUser} listWorkspaces={listWorkspaces} />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
