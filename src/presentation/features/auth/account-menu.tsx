import { Avatar, DropdownMenu, Inline, Text } from '@raulrod/ui';
import { LogOut } from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { AuthUser } from '../../../application/ports';
import type { LogoutUser } from '../../../application/commands';
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
  const { signingOut, signOutError, signOut } = useSignOut(logoutUser);
  const name = currentUser?.displayName ?? currentUser?.email ?? 'Account';

  return (
    <Inline gap="space-2" align="center">
      {signOutError === null ? null : (
        <Text role="alert" color="color.text.danger">
          {signOutError}
        </Text>
      )}
      <DropdownMenu>
        <Trigger aria-label="Open account menu">
          <Avatar name={name} size="sm" />
        </Trigger>
        <DropdownMenu.Content placement="bottom-end">
          {currentUser === null ? null : (
            <>
              <Identity>
                {currentUser.displayName === null ? null : (
                  <Text weight="font.weight.medium">{currentUser.displayName}</Text>
                )}
                {currentUser.email === null ? null : (
                  <Text color="color.text.muted" size="font.size.sm">
                    {currentUser.email}
                  </Text>
                )}
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
            {signingOut ? 'Signing out…' : 'Sign out'}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    </Inline>
  );
}
