import { Button, Heading, Inline, Stack, Text } from '@raulrod/ui';
import { useState, type ReactNode } from 'react';
import { useSession } from '../../../app/providers/session-provider';
import type { LoginUser, LogoutUser, RegisterUser } from '../../../application/commands';
import { toAppError } from '../../../shared/errors';
import { describeLoginError } from './auth-error-messages';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';

type AuthView = 'sign-in' | 'sign-up';

export interface AuthFlowProps {
  readonly registerUser: RegisterUser;
  readonly loginUser: LoginUser;
  readonly logoutUser: LogoutUser;
}

export function AuthFlow({ registerUser, loginUser, logoutUser }: AuthFlowProps): ReactNode {
  const session = useSession();
  const [view, setView] = useState<AuthView>('sign-up');
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
          setView('sign-in');
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

  if (session.status === 'loading') {
    return (
      <Inline gap="space-2" align="center" justify="center">
        <Text role="status" color="color.text.muted">
          Restoring your session…
        </Text>
      </Inline>
    );
  }

  if (session.status === 'authenticated') {
    const user = session.user;

    return (
      <Stack gap="space-5">
        <Stack gap="space-2">
          <Heading as="h1">You are signed in</Heading>
          <Text color="color.text.muted">
            {user.email !== null ? `${user.email} is ready to plan.` : 'Your account is ready.'}
          </Text>
        </Stack>
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

  if (view === 'sign-in') {
    return (
      <Stack gap="space-4">
        <LoginForm loginUser={loginUser} />
        <Inline gap="space-2" align="center" justify="center">
          <Text color="color.text.muted">New here?</Text>
          <Button type="button" variant="link" onClick={() => setView('sign-up')}>
            Create an account
          </Button>
        </Inline>
      </Stack>
    );
  }

  return (
    <Stack gap="space-4">
      <RegisterForm registerUser={registerUser} />
      <Inline gap="space-2" align="center" justify="center">
        <Text color="color.text.muted">Already have an account?</Text>
        <Button type="button" variant="link" onClick={() => setView('sign-in')}>
          Sign in
        </Button>
      </Inline>
    </Stack>
  );
}
