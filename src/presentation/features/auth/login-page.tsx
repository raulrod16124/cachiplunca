import { Inline, Stack } from '@raulrod/ui';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LoginUser } from '../../../application/commands';
import { AuthLayout } from './auth-layout';
import { LoginForm } from './login-form';
import { useI18n } from '../../i18n';
import { AuthSwitchButton, AuthSwitchText } from './auth-form-styles';

export interface LoginPageProps {
  readonly loginUser: LoginUser;
}

export function LoginPage({ loginUser }: LoginPageProps): ReactNode {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <AuthLayout>
      <Stack gap="space-6">
        <LoginForm loginUser={loginUser} />
        <Inline gap="space-2" align="center" justify="center">
          <AuthSwitchText>{t('auth.signIn.newHere')}</AuthSwitchText>
          <AuthSwitchButton type="button" variant="link" onClick={() => navigate('/register')}>
            {t('auth.signIn.createAccount')}
          </AuthSwitchButton>
        </Inline>
      </Stack>
    </AuthLayout>
  );
}
