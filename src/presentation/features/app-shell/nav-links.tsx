import { LayoutGrid, UserRound } from '@raulrod/icons';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { NavItem } from './nav-item';

export interface NavLinksProps {
  readonly onNavigate?: () => void;
}

export function NavLinks({ onNavigate }: NavLinksProps): ReactNode {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const workspacesActive = pathname === '/workspaces' || pathname.startsWith('/workspaces/');
  const profileActive = pathname === '/profile';

  return (
    <>
      <NavItem
        to="/workspaces"
        active={workspacesActive}
        icon={<LayoutGrid aria-hidden="true" size={16} />}
        onClick={() => onNavigate?.()}
      >
        {t('shell.nav.workspaces')}
      </NavItem>
      <NavItem
        to="/profile"
        active={profileActive}
        icon={<UserRound aria-hidden="true" size={16} />}
        onClick={() => onNavigate?.()}
      >
        {t('shell.nav.profile')}
      </NavItem>
    </>
  );
}
