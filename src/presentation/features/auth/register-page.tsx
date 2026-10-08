import { Button, Inline, Stack, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RegisterUser } from '../../../application/commands';
import { AuthLayout } from './auth-layout';
import { RegisterForm } from './register-form';

export interface RegisterPageProps {
  readonly registerUser: RegisterUser;
}

export function RegisterPage({ registerUser }: RegisterPageProps): ReactNode {
  const navigate = useNavigate();

  return (
    <AuthLayout>
      <Stack gap="space-4">
        <RegisterForm registerUser={registerUser} />
        <Inline gap="space-2" align="center" justify="center">
          <Text color="color.text.muted">Already have an account?</Text>
          <Button type="button" variant="link" onClick={() => navigate('/login')}>
            Sign in
          </Button>
        </Inline>
      </Stack>
    </AuthLayout>
  );
}
