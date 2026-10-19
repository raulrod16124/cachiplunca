import { Avatar, DropdownMenu, Inline, Text } from '@raulrod/ui';
import { LogOut, Settings, UserRound } from '@raulrod/icons';
import type { ReactNode } from 'react';
import { useState } from 'react';
import styled from 'styled-components';
import type { AuthUser } from '../../../application/ports';
import type { LogoutUser } from '../../../application/commands';
import { useI18n } from '../../i18n';
import { ProfileModal } from '../profile/profile-modal';
import { useProfileServices } from '../profile/profile-services-provider';
import { useSignOut } from './use-sign-out';

const Trigger = styled(DropdownMenu.Trigger)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space[1]};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.full};
  background: transparent;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.background.sunken};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
`;

const Identity = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[2]}`};
`;

export interface AccountMenuProps {
  readonly currentUser: AuthUser | null;
  readonly logoutUser: LogoutUser;
}

export function AccountMenu({ currentUser, logoutUser }: AccountMenuProps): ReactNode {
  const { t } = useI18n();
  const { signingOut, signOutError, signOut } = useSignOut(logoutUser);
  const profileServices = useProfileServices();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  const avatarName = currentUser?.displayName ?? currentUser?.email ?? 'Account';
  const identityName = currentUser?.displayName;
  const identityLabel = identityName ?? t('shell.account.identity');

  const openProfile = (tab: 'profile' | 'security' | 'preferences') => {
    setProfileTab(tab);
    setProfileOpen(true);
  };

  return (
    <Inline gap="space-2" align="center">
      {signOutError === null ? null : (
        <Text role="alert" color="color.text.danger">
          {signOutError}
        </Text>
      )}
      <DropdownMenu>
        <Trigger aria-label={t('shell.account.open')}>
          <Avatar name={avatarName} size="sm" />
        </Trigger>
        <DropdownMenu.Content placement="bottom-end">
          {currentUser === null ? null : (
            <>
              <Identity>
                <Text weight="font.weight.medium">{identityLabel}</Text>
              </Identity>
              <DropdownMenu.Separator />
            </>
          )}
          {currentUser !== null && profileServices !== null ? (
            <DropdownMenu.Item
              onSelect={() => {
                openProfile('profile');
              }}
              startIcon={<UserRound aria-hidden="true" size={16} />}
            >
              {t('shell.account.profile')}
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Item
            onSelect={() => {
              openProfile('preferences');
            }}
            startIcon={<Settings aria-hidden="true" size={16} />}
          >
            {t('shell.account.preferences')}
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            disabled={signingOut}
            onSelect={() => {
              void signOut();
            }}
            startIcon={<LogOut aria-hidden="true" size={16} />}
          >
            {signingOut ? t('shell.account.signingOut') : t('shell.account.signOut')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
      <ProfileModal
        open={profileOpen}
        onOpenChange={setProfileOpen}
        currentUser={currentUser}
        initialTab={profileTab}
      />
    </Inline>
  );
}
