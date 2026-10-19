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
import type { LoginFieldErrors, LoginUser } from '../../../application/commands';
import { toAppError } from '../../../shared/errors';
import { localizeFieldError, localizeMessage, useI18n } from '../../i18n';
import { PasswordInput } from './password-input';
import { describeLoginError } from './auth-error-messages';

export interface LoginFormProps {
  readonly loginUser: LoginUser;
}

export function LoginForm({ loginUser }: LoginFormProps): ReactNode {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const result = await loginUser({ email, password });
      switch (result.status) {
        case 'ok':
          break;
        case 'invalid-input':
          setFieldErrors(result.fieldErrors);
          break;
        case 'error':
          setFormError(localizeMessage(t, describeLoginError(result.error)));
          break;
      }
    } catch (error) {
      setFormError(localizeMessage(t, describeLoginError(toAppError(error))));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack gap="space-5">
      <Stack gap="space-2">
        <Heading as="h1">{t('auth.signIn.title')}</Heading>
        <Text color="color.text.muted">{t('auth.signIn.subtitle')}</Text>
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
            <FormFieldDescription>{t('auth.passwordHint')}</FormFieldDescription>
            <FormFieldControl>
              {(field) => (
                <PasswordInput
                  {...field}
                  name="password"
                  autoComplete="current-password"
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
            {t('auth.signIn.submit')}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
