import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { SessionLoading } from '../../presentation/components/session-loading';
import { useSession } from '../providers/session-provider';

export function RequireAnonymous(): ReactNode {
  const session = useSession();

  if (session.status === 'loading') {
    return <SessionLoading />;
  }

  if (session.status === 'authenticated') {
    return <Navigate to="/workspaces" replace />;
  }

  return <Outlet />;
}
