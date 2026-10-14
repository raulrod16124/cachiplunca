import { Button, Stack, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';
import type { LogoutUser } from '../../../application/commands';
import { useSignOut } from './use-sign-out';

export interface SignOutButtonProps {
  readonly logoutUser: LogoutUser;
}

export function SignOutButton({ logoutUser }: SignOutButtonProps): ReactNode {
  const { signingOut, signOutError, signOut } = useSignOut(logoutUser);

  return (
    <Stack gap="space-3">
      {signOutError !== null && (
        <Text role="alert" color="color.text.danger">
          {signOutError}
        </Text>
      )}
      <Button
        type="button"
        variant="outline"
        loading={signingOut}
        onClick={() => {
          void signOut();
        }}
      >
        Sign out
      </Button>
    </Stack>
  );
}
