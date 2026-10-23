import { Inline, Stack } from '@raulrod/ui';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RegisterUser, SendEmailVerification } from '../../../application/commands';
import { AuthLayout } from './auth-layout';
import { RegisterForm } from './register-form';
import { useI18n } from '../../i18n';
import { AuthSwitchButton, AuthSwitchText } from './auth-form-styles';

export interface RegisterPageProps {
  readonly registerUser: RegisterUser;
  readonly sendEmailVerification?: SendEmailVerification;
}

export function RegisterPage({
  registerUser,
  sendEmailVerification,
}: RegisterPageProps): ReactNode {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <AuthLayout>
      <Stack gap="space-6">
        <RegisterForm registerUser={registerUser} sendEmailVerification={sendEmailVerification} />
        <Inline gap="space-2" align="center" justify="center">
          <AuthSwitchText>{t('auth.register.haveAccount')}</AuthSwitchText>
          <AuthSwitchButton type="button" variant="link" onClick={() => navigate('/login')}>
            {t('auth.register.signIn')}
          </AuthSwitchButton>
        </Inline>
      </Stack>
    </AuthLayout>
  );
}
