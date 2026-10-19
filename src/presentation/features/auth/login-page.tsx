import { Button, Inline, Stack, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LoginUser } from '../../../application/commands';
import { AuthLayout } from './auth-layout';
import { LoginForm } from './login-form';
import { useI18n } from '../../i18n';

export interface LoginPageProps {
  readonly loginUser: LoginUser;
}

export function LoginPage({ loginUser }: LoginPageProps): ReactNode {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <AuthLayout>
      <Stack gap="space-4">
        <LoginForm loginUser={loginUser} />
        <Inline gap="space-2" align="center" justify="center">
          <Text color="color.text.muted">{t('auth.signIn.newHere')}</Text>
          <Button type="button" variant="link" onClick={() => navigate('/register')}>
            {t('auth.signIn.createAccount')}
          </Button>
        </Inline>
      </Stack>
    </AuthLayout>
  );
}
