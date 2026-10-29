import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { FullPageLoading } from '../../presentation/components/full-page-loading';
import { useSession } from '../../presentation/providers/session-provider';

export function RequireAuth(): ReactNode {
  const session = useSession();

  if (session.status === 'loading') {
    return <FullPageLoading messageKey="session.restoring" />;
  }

  if (session.status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  if (session.user.email === null) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
