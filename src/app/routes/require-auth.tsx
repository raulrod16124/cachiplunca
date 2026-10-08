import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { SessionLoading } from '../../presentation/components/session-loading';
import { useSession } from '../providers/session-provider';

export function RequireAuth(): ReactNode {
  const session = useSession();

  if (session.status === 'loading') {
    return <SessionLoading />;
  }

  if (session.status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
