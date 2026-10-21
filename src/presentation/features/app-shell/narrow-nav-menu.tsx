import { Button, Dialog, DialogContent, Text } from '@raulrod/ui';
import { LogOut, Menu, Plus } from '@raulrod/icons';
import { useState, type ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import type { LogoutUser } from '../../../application/commands';
import type { AuthUser } from '../../../application/ports';
import { PanelHeader } from '../../components/panel-header';
import { useI18n } from '../../i18n';
import { useMediaQuery } from '../../hooks/use-media-query';
import { useSignOut } from '../auth/use-sign-out';
import { NavLinks } from './nav-links';

export const NARROW_NAV_DRAWER_CLASS = 'app-nav-drawer';

const slideIn = keyframes`
  from {
    transform: translateX(-100%);
  }
  to {
    transform: none;
  }
`;

const MenuTrigger = styled(Dialog.Trigger)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ theme }) => theme.space[10]};
  height: ${({ theme }) => theme.space[10]};
  padding: 0;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  color: ${({ theme }) => theme.color.text.primary};
  cursor: pointer;
  transition:
    background-color ${({ theme }) => theme.motion.duration.fast}
      ${({ theme }) => theme.motion.easing.standard},
    color ${({ theme }) => theme.motion.duration.fast}
      ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    background: ${({ theme }) => theme.color.background.sunken};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
`;

const Sheet = styled(DialogContent)`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0;
  width: clamp(280px, 80vw, 320px);
  max-width: 100vw;
  height: 100dvh;
  max-block-size: 100dvh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border-right: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: 0;
  background: ${({ theme }) => theme.color.background.surface};
  box-shadow: ${({ theme }) => theme.shadow.md};
  animation: ${slideIn} ${({ theme }) => theme.motion.duration.base}
    ${({ theme }) => theme.motion.easing.enter};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const DrawerNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
`;

const Body = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};
  min-height: 0;
  padding: ${({ theme }) => theme.space[4]};
  overflow-y: auto;
`;

const Footer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[4]};
  border-top: 1px solid ${({ theme }) => theme.color.border.default};
`;

const Identity = styled.div`
  display: flex;
  min-width: 0;

  & > * {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export interface NarrowNavMenuProps {
  readonly currentUser: AuthUser | null;
  readonly logoutUser: LogoutUser;
  readonly onCreateWorkspace: () => void;
  readonly pendingInvitationCount?: number;
}

export function NarrowNavMenu({
  currentUser,
  logoutUser,
  onCreateWorkspace,
  pendingInvitationCount = 0,
}: NarrowNavMenuProps): ReactNode {
  const { t } = useI18n();
  const isNarrow = useMediaQuery('(max-width: 900px)');
  const { signingOut, signOutError, signOut } = useSignOut(logoutUser);
  const [open, setOpen] = useState(false);
  const name = currentUser?.displayName ?? t('shell.account.identity');

  const handleCreateWorkspace = () => {
    setOpen(false);
    onCreateWorkspace();
  };

  if (!isNarrow) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen} classNames={{ content: NARROW_NAV_DRAWER_CLASS }}>
      <MenuTrigger aria-label={t('shell.nav.openMenu')}>
        <Menu aria-hidden="true" size={20} />
      </MenuTrigger>
      <Sheet aria-label={t('shell.nav.title')}>
        <PanelHeader
          title={t('shell.nav.title')}
          onClose={() => {
            setOpen(false);
          }}
          closeLabel={t('shell.nav.closeMenu')}
        />
        <Body>
          <DrawerNav aria-label={t('shell.nav.label')}>
            <NavLinks
              pendingInvitationCount={pendingInvitationCount}
              onNavigate={() => {
                setOpen(false);
              }}
            />
          </DrawerNav>
          <Button type="button" variant="primary" onClick={handleCreateWorkspace}>
            <Plus aria-hidden="true" size={16} />
            {t('shell.newWorkspace')}
          </Button>
        </Body>
        <Footer>
          {signOutError === null ? null : (
            <Text role="alert" color="color.text.danger">
              {signOutError}
            </Text>
          )}
          <Identity>
            <Text weight="font.weight.medium" size="font.size.sm">
              {name}
            </Text>
          </Identity>
          <Button
            type="button"
            variant="outline"
            loading={signingOut}
            onClick={() => {
              void signOut();
            }}
          >
            <LogOut aria-hidden="true" size={16} />
            {signingOut ? t('shell.account.signingOut') : t('shell.account.signOut')}
          </Button>
        </Footer>
      </Sheet>
    </Dialog>
  );
}
