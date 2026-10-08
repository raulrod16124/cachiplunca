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
import { describeRegisterError } from './auth-error-messages';

export interface RegisterFormProps {
  readonly registerUser: RegisterUser;
  readonly onRegistered?: (user: AuthUser) => void;
}

export function RegisterForm({ registerUser, onRegistered }: RegisterFormProps): ReactNode {
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
          onRegistered?.(result.user);
          break;
        case 'invalid-input':
          setFieldErrors(result.fieldErrors);
          break;
        case 'error':
          setFormError(describeRegisterError(result.error));
          break;
      }
    } catch (error) {
      setFormError(describeRegisterError(toAppError(error)));
    } finally {
      setSubmitting(false);
    }
  }

  if (registeredUser !== null) {
    return (
      <Stack gap="space-3">
        <Heading as="h2">Account created</Heading>
        <Text color="color.text.success">
          Your account{registeredUser.email !== null ? ` (${registeredUser.email})` : ''} is ready.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="space-5">
      <Stack gap="space-2">
        <Heading as="h1">Create your account</Heading>
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
            <FormFieldDescription>At least 6 characters.</FormFieldDescription>
            <FormFieldControl>
              {(field) => (
                <Input
                  {...field}
                  type="password"
                  name="password"
                  autoComplete="new-password"
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
            Create account
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
