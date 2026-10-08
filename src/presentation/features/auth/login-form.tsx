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
import { describeLoginError } from './auth-error-messages';

export interface LoginFormProps {
  readonly loginUser: LoginUser;
}

export function LoginForm({ loginUser }: LoginFormProps): ReactNode {
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
          setFormError(describeLoginError(result.error));
          break;
      }
    } catch (error) {
      setFormError(describeLoginError(toAppError(error)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack gap="space-5">
      <Stack gap="space-2">
        <Heading as="h1">Sign in</Heading>
        <Text color="color.text.muted">Turn scattered ideas into a shared plan.</Text>
      </Stack>
      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="space-4">
          <FormField>
            <FormFieldLabel>Email</FormFieldLabel>
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
              <FormFieldError>{fieldErrors.email}</FormFieldError>
            )}
          </FormField>
          <FormField>
            <FormFieldLabel>Password</FormFieldLabel>
            <FormFieldDescription>Use the password of your account.</FormFieldDescription>
            <FormFieldControl>
              {(field) => (
                <Input
                  {...field}
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              )}
            </FormFieldControl>
            {fieldErrors.password !== undefined && (
              <FormFieldError>{fieldErrors.password}</FormFieldError>
            )}
          </FormField>
          {formError !== null && (
            <Text role="alert" color="color.text.danger">
              {formError}
            </Text>
          )}
          <Button type="submit" loading={submitting}>
            Sign in
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
