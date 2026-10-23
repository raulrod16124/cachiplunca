import { LayoutGrid, SlidersHorizontal, Star, UserRound } from '@raulrod/icons';
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
  const favoritesActive = pathname === '/favorites';
  const profileActive = pathname === '/profile';
  const settingsActive = pathname === '/settings';

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
        to="/favorites"
        active={favoritesActive}
        icon={<Star aria-hidden="true" size={16} />}
        onClick={() => onNavigate?.()}
      >
        {t('shell.nav.favorites')}
      </NavItem>
      <NavItem
        to="/profile"
        active={profileActive}
        icon={<UserRound aria-hidden="true" size={16} />}
        onClick={() => onNavigate?.()}
      >
        {t('shell.nav.profile')}
      </NavItem>
      <NavItem
        to="/settings"
        active={settingsActive}
        icon={<SlidersHorizontal aria-hidden="true" size={16} />}
        onClick={() => onNavigate?.()}
      >
        {t('shell.nav.settings')}
      </NavItem>
    </>
  );
}
