import { ArrowRight, Check } from '@raulrod/icons';
import {
  Checkbox,
  FormField,
  FormFieldControl,
  FormFieldError,
  FormFieldLabel,
  Input,
  Stack,
  Text,
} from '@raulrod/ui';
import { useState, type FormEvent, type ReactNode } from 'react';
import styled from 'styled-components';
import type { LoginFieldErrors, LoginUser } from '../../../application/commands';
import { toAppError } from '../../../shared/errors';
import { localizeFieldError, localizeMessage, useI18n } from '../../i18n';
import { PasswordInput } from './password-input';
import { describeLoginError } from './auth-error-messages';
import { AuthFormRoot, AuthSubmit, AuthSubtitle, AuthTitle } from './auth-form-styles';

export interface LoginFormProps {
  readonly loginUser: LoginUser;
}

const RememberMe = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  width: fit-content;
  cursor: pointer;
`;

const RememberBox = styled.span`
  position: relative;
  display: inline-flex;
  flex: none;
`;

const RememberGlyph = styled(Check)<{ $visible: boolean }>`
  position: absolute;
  top: 50%;
  left: 3px;
  color: var(--stitch-on-primary);
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: none;
  transform: translateY(-50%) scale(${({ $visible }) => ($visible ? 1 : 0.6)});
  transition:
    opacity ${({ theme }) => theme.motion.duration.fast}
      ${({ theme }) => theme.motion.easing.standard},
    transform ${({ theme }) => theme.motion.duration.fast}
      ${({ theme }) => theme.motion.easing.standard};
`;

export function LoginForm({ loginUser }: LoginFormProps): ReactNode {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
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
      const result = await loginUser({ email, password, remember: rememberMe });
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
    <AuthFormRoot>
      <Stack gap="space-2">
        <AuthTitle as="h1">{t('auth.signIn.title')}</AuthTitle>
        <AuthSubtitle>{t('auth.signIn.subtitle')}</AuthSubtitle>
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
            <FormFieldControl>
              {(field) => (
                <PasswordInput
                  {...field}
                  name="password"
                  autoComplete="current-password"
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
          <RememberMe>
            <RememberBox>
              <Checkbox
                name="rememberMe"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <RememberGlyph aria-hidden="true" $visible={rememberMe} size={14} strokeWidth={3} />
            </RememberBox>
            <Text size="font.size.sm">{t('auth.rememberMe')}</Text>
          </RememberMe>
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
            {t('auth.signIn.submit')}
          </AuthSubmit>
        </Stack>
      </form>
    </AuthFormRoot>
  );
}
