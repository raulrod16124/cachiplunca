import { ArrowRight } from '@raulrod/icons';
import {
  Button,
  FormField,
  FormFieldControl,
  FormFieldDescription,
  FormFieldError,
  FormFieldLabel,
  Input,
  Stack,
  Text,
} from '@raulrod/ui';
import { useState, type FormEvent, type ReactNode } from 'react';
import {
  DISPLAY_NAME_MAX_LENGTH,
  type RegisterFieldErrors,
  type RegisterUser,
  type SendEmailVerification,
} from '../../../application/commands';
import type { AuthUser } from '../../../application/ports';
import { toAppError } from '../../../shared/errors';
import { localizeFieldError, localizeMessage, useI18n } from '../../i18n';
import { PasswordInput } from './password-input';
import { describeRegisterError } from './auth-error-messages';
import { AuthFormRoot, AuthSubmit, AuthSubtitle, AuthTitle } from './auth-form-styles';

export interface RegisterFormProps {
  readonly registerUser: RegisterUser;
  readonly sendEmailVerification?: SendEmailVerification;
}

export function RegisterForm({
  registerUser,
  sendEmailVerification,
}: RegisterFormProps): ReactNode {
  const { t } = useI18n();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<AuthUser | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle');

  async function sendVerification(): Promise<void> {
    if (sendEmailVerification === undefined) {
      return;
    }
    setVerificationStatus('sending');
    const result = await sendEmailVerification();
    setVerificationStatus(result.status === 'ok' ? 'sent' : 'error');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const result = await registerUser({ email, password, displayName });
      switch (result.status) {
        case 'ok':
          setRegisteredUser(result.user);
          void sendVerification();
          break;
        case 'invalid-input':
          setFieldErrors(result.fieldErrors);
          break;
        case 'error':
          setFormError(localizeMessage(t, describeRegisterError(result.error)));
          break;
      }
    } catch (error) {
      setFormError(localizeMessage(t, describeRegisterError(toAppError(error))));
    } finally {
      setSubmitting(false);
    }
  }

  if (registeredUser !== null) {
    return (
      <Stack gap="space-3">
        <AuthTitle as="h2">{t('auth.register.successTitle')}</AuthTitle>
        <Text color="color.text.success">
          {t('auth.register.successDescription', { email: registeredUser.email ?? '' })}
        </Text>
        {sendEmailVerification !== undefined && (
          <>
            {verificationStatus === 'sent' ? (
              <Text role="status" color="color.text.muted">
                {t('auth.register.verificationSent')}
              </Text>
            ) : (
              <Button
                type="button"
                variant="outline"
                loading={verificationStatus === 'sending'}
                onClick={() => void sendVerification()}
              >
                {t('auth.register.resendVerification')}
              </Button>
            )}
            {verificationStatus === 'error' && (
              <Text role="alert" color="color.text.danger">
                {t('auth.register.verificationError')}
              </Text>
            )}
          </>
        )}
      </Stack>
    );
  }

  return (
    <AuthFormRoot>
      <Stack gap="space-2">
        <AuthTitle as="h1">{t('auth.register.title')}</AuthTitle>
        <AuthSubtitle>{t('auth.register.subtitle')}</AuthSubtitle>
      </Stack>
      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="space-4">
          <FormField>
            <FormFieldLabel>{t('auth.displayName')}</FormFieldLabel>
            <FormFieldDescription>{t('auth.register.displayNameHint')}</FormFieldDescription>
            <FormFieldControl>
              {(field) => (
                <Input
                  {...field}
                  name="displayName"
                  autoComplete="name"
                  maxLength={DISPLAY_NAME_MAX_LENGTH}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              )}
            </FormFieldControl>
            {fieldErrors.displayName !== undefined && (
              <FormFieldError>{localizeFieldError(t, fieldErrors.displayName)}</FormFieldError>
            )}
          </FormField>
          <FormField>
            <FormFieldLabel>{t('auth.email')}</FormFieldLabel>
            <FormFieldControl>
              {(field) => (
                <Input
                  {...field}
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              )}
            </FormFieldControl>
            {fieldErrors.email !== undefined && (
              <FormFieldError>{localizeFieldError(t, fieldErrors.email)}</FormFieldError>
            )}
          </FormField>
          <FormField>
            <FormFieldLabel>{t('auth.password')}</FormFieldLabel>
            <FormFieldDescription>{t('auth.register.passwordHint')}</FormFieldDescription>
            <FormFieldControl>
              {(field) => (
                <PasswordInput
                  {...field}
                  name="password"
                  autoComplete="new-password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              )}
            </FormFieldControl>
            {fieldErrors.password !== undefined && (
              <FormFieldError>{localizeFieldError(t, fieldErrors.password)}</FormFieldError>
            )}
          </FormField>
          {formError !== null && (
            <Text role="alert" color="color.text.danger">
              {formError}
            </Text>
          )}
          <AuthSubmit
            type="submit"
            variant="secondary"
            loading={submitting}
            endIcon={<ArrowRight aria-hidden="true" size={18} />}
          >
            {t('auth.register.submit')}
          </AuthSubmit>
        </Stack>
      </form>
    </AuthFormRoot>
  );
}
