import { Badge } from '@raulrod/ui';
import { LayoutGrid, Mail, UserRound } from '@raulrod/icons';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { NavItem } from './nav-item';

export interface NavLinksProps {
  readonly pendingInvitationCount?: number;
  readonly onNavigate?: () => void;
}

export function NavLinks({ pendingInvitationCount = 0, onNavigate }: NavLinksProps): ReactNode {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const hasPendingInvitations = pendingInvitationCount > 0;
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
        href="#pending-invitations"
        icon={<Mail aria-hidden="true" size={16} />}
        onClick={() => onNavigate?.()}
        aria-label={
          hasPendingInvitations
            ? t('shell.nav.pendingInvitations', { count: pendingInvitationCount })
            : undefined
        }
        badge={
          hasPendingInvitations ? (
            <Badge variant="info" aria-hidden="true">
              {pendingInvitationCount}
            </Badge>
          ) : undefined
        }
      >
        {t('shell.nav.invitations')}
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
