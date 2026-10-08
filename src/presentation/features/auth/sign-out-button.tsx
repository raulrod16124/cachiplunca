import { Button, Stack, Text } from '@raulrod/ui';
import { useState, type ReactNode } from 'react';
import type { LogoutUser } from '../../../application/commands';
import { toAppError } from '../../../shared/errors';
import { describeLoginError } from './auth-error-messages';

export interface SignOutButtonProps {
  readonly logoutUser: LogoutUser;
}

export function SignOutButton({ logoutUser }: SignOutButtonProps): ReactNode {
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleSignOut(): Promise<void> {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    setSignOutError(null);

    try {
      const result = await logoutUser();
      switch (result.status) {
        case 'ok':
          break;
        case 'error':
          setSignOutError(describeLoginError(result.error));
          break;
      }
    } catch (error) {
      setSignOutError(describeLoginError(toAppError(error)));
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Stack gap="space-3">
      {signOutError !== null && (
        <Text role="alert" color="color.text.danger">
          {signOutError}
        </Text>
      )}
      <Button type="button" variant="outline" loading={signingOut} onClick={handleSignOut}>
        Sign out
      </Button>
    </Stack>
  );
}
