import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { SessionLoading } from '../../presentation/components/session-loading';
import { useSession } from '../../presentation/providers/session-provider';

export function resolveRedirect(search: string): string | null {
  const redirect = new URLSearchParams(search).get('redirect');
  if (
    redirect === null ||
    !redirect.startsWith('/') ||
    redirect.startsWith('//') ||
    redirect.includes('\\')
  ) {
    return null;
  }
  return redirect;
}

export function RequireAnonymous(): ReactNode {
  const session = useSession();
  const location = useLocation();

  if (session.status === 'loading') {
    return <SessionLoading />;
  }

  if (session.status === 'authenticated' && session.user.email !== null) {
    return <Navigate to={resolveRedirect(location.search) ?? '/workspaces'} replace />;
  }

  return <Outlet />;
}
