import { Avatar, DropdownMenu, Inline, Text, VisuallyHidden } from '@raulrod/ui';
import { ChevronsUpDown, LogOut } from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { AuthUser } from '../../../application/ports';
import type { LogoutUser } from '../../../application/commands';
import { useI18n } from '../../i18n';
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
    background: var(--cach-control-hover);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
`;

const ProfileTrigger = styled(DropdownMenu.Trigger)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  width: 100%;
  min-width: 0;
  padding: ${({ theme }) => theme.space[2]};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background ${({ theme }) => theme.motion.duration.fast} ease;

  &:hover {
    background: color-mix(in srgb, var(--stitch-text) 7%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--rr-color-focus-ring);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const ProfileIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  min-width: 0;
`;

const AvatarWrap = styled.div`
  position: relative;
  flex: none;
`;

const OnlineDot = styled.span`
  position: absolute;
  right: 0;
  bottom: 0;
  width: 10px;
  height: 10px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: var(--stitch-online);
  box-shadow: 0 0 0 2px var(--stitch-surface);
`;

const IdentityText = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const Name = styled.span`
  overflow: hidden;
  color: var(--stitch-text);
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Status = styled.span`
  overflow: hidden;
  color: var(--stitch-text-subtle);
  font-size: ${({ theme }) => theme.font.size['2xs']};
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Chevron = styled(ChevronsUpDown)`
  flex: none;
  color: var(--stitch-text-subtle);
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
  readonly variant?: 'compact' | 'profile';
}

export function AccountMenu({
  currentUser,
  logoutUser,
  variant = 'compact',
}: AccountMenuProps): ReactNode {
  const { t } = useI18n();
  const { signingOut, signOutError, signOut } = useSignOut(logoutUser);
  const avatarName = currentUser?.displayName ?? currentUser?.email ?? 'Account';
  const identityName = currentUser?.displayName;
  const identityLabel = identityName ?? t('shell.account.identity');
  const onlineLabel = t('shell.account.online');

  const menu = (
    <DropdownMenu.Content placement="bottom-end">
      {currentUser === null ? null : (
        <>
          <Identity>
            <Text weight="font.weight.medium">{identityLabel}</Text>
          </Identity>
          <DropdownMenu.Separator />
        </>
      )}
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
  );

  return (
    <Inline gap="space-2" align="center">
      {signOutError === null ? null : (
        <Text role="alert" color="color.text.danger">
          {signOutError}
        </Text>
      )}
      {variant === 'profile' ? (
        <DropdownMenu>
          <ProfileTrigger aria-label={t('shell.account.open')}>
            <ProfileIdentity>
              <AvatarWrap>
                <Avatar
                  name={avatarName}
                  size="sm"
                  styles={{
                    backgroundColor: 'var(--stitch-avatar-bg)',
                    border: '1px solid var(--stitch-avatar-border)',
                    color: 'var(--stitch-avatar-text)',
                  }}
                />
                <OnlineDot aria-hidden="true" />
                <VisuallyHidden>{onlineLabel}</VisuallyHidden>
              </AvatarWrap>
              <IdentityText>
                <Name>{identityLabel}</Name>
                <Status>{onlineLabel}</Status>
              </IdentityText>
            </ProfileIdentity>
            <Chevron aria-hidden="true" size={16} />
          </ProfileTrigger>
          {menu}
        </DropdownMenu>
      ) : (
        <DropdownMenu>
          <Trigger aria-label={t('shell.account.open')}>
            <Avatar name={avatarName} size="sm" />
          </Trigger>
          {menu}
        </DropdownMenu>
      )}
    </Inline>
  );
}
