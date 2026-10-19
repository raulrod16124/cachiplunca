import {
  Button,
  FormField,
  FormFieldControl,
  FormFieldDescription,
  FormFieldError,
  FormFieldLabel,
  Heading,
  Input,
  Stack,
  Text,
} from '@raulrod/ui';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { RegisterFieldErrors, RegisterUser } from '../../../application/commands';
import type { AuthUser } from '../../../application/ports';
import { toAppError } from '../../../shared/errors';
import { localizeFieldError, localizeMessage, useI18n } from '../../i18n';
import { PasswordInput } from './password-input';
import { describeRegisterError } from './auth-error-messages';

export interface RegisterFormProps {
  readonly registerUser: RegisterUser;
}

export function RegisterForm({ registerUser }: RegisterFormProps): ReactNode {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<AuthUser | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const result = await registerUser({ email, password });
      switch (result.status) {
        case 'ok':
          setRegisteredUser(result.user);
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
        <Heading as="h2">{t('auth.register.successTitle')}</Heading>
        <Text color="color.text.success">
          {t('auth.register.successDescription', { email: registeredUser.email ?? '' })}
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="space-5">
      <Stack gap="space-2">
        <Heading as="h1">{t('auth.register.title')}</Heading>
        <Text color="color.text.muted">{t('auth.register.subtitle')}</Text>
      </Stack>
      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="space-4">
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
          <Button type="submit" loading={submitting}>
            {t('auth.register.submit')}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
