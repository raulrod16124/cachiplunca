import {
  Avatar,
  Badge,
  Button,
  FormField,
  FormFieldControl,
  FormFieldDescription,
  FormFieldError,
  FormFieldLabel,
  Heading,
  Inline,
  Input,
  Stack,
  Tabs,
  Text,
} from '@raulrod/ui';
import { Mail, ShieldCheck, Sparkles } from '@raulrod/icons';
import { useState, type FormEvent, type ReactNode } from 'react';
import styled from 'styled-components';
import {
  DISPLAY_NAME_MAX_LENGTH,
  type ChangeUserEmailFieldErrors,
  type ChangeUserPasswordFieldErrors,
  type UpdateUserProfileFieldErrors,
} from '../../../application/commands';
import type { AuthUser } from '../../../application/ports';
import { toAppError, ERROR_CODES, type AppError } from '../../../shared/errors';
import { localizeFieldError, useI18n, type I18nContextValue } from '../../i18n';
import { PasswordInput } from '../auth/password-input';
import {
  StitchPanel,
  StitchSection,
  StitchSectionHeading,
  StitchSectionIcon,
  StitchSectionTitle,
} from '../../components/stitch-page-shell';
import { useProfileServices } from './profile-services-provider';

export const PROFILE_TAB = 'profile';
export const SECURITY_TAB = 'security';

export type ProfileTab = typeof PROFILE_TAB | typeof SECURITY_TAB;

export function isProfileTab(value: string | null): value is ProfileTab {
  return value === PROFILE_TAB || value === SECURITY_TAB;
}

const IdentityPanel = styled(StitchPanel)`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.space[4]};
  background: linear-gradient(
    135deg,
    var(--stitch-surface),
    color-mix(in srgb, var(--stitch-secondary) 7%, var(--stitch-surface))
  );

  @media (max-width: 560px) {
    align-items: flex-start;
  }
`;

const AvatarFrame = styled.span`
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border: 1px solid color-mix(in srgb, var(--stitch-secondary) 30%, transparent);
  border-radius: ${({ theme }) => theme.radius.full};
  background: var(--stitch-surface);
  box-shadow: ${({ theme }) => theme.shadow.sm};
`;

const IdentityText = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  min-width: 0;

  & > * {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const IdentityName = styled.span`
  color: var(--stitch-text);
  font-size: ${({ theme }) => theme.font.size.xl};
  font-weight: ${({ theme }) => theme.font.weight.bold};
  letter-spacing: -0.015em;
  line-height: 1.2;
`;

const IdentityEmail = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
  color: var(--stitch-text-muted);
  font-size: ${({ theme }) => theme.font.size.sm};
  min-width: 0;

  svg {
    flex: none;
    color: var(--stitch-text-subtle);
  }
`;

const VerifiedBadge = styled.span`
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid color-mix(in srgb, var(--stitch-secondary) 30%, transparent);
  border-radius: ${({ theme }) => theme.radius.full};
  background: color-mix(in srgb, var(--stitch-secondary) 12%, transparent);
  color: var(--stitch-secondary);
  font-size: ${({ theme }) => theme.font.size['2xs']};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  white-space: nowrap;

  @media (max-width: 560px) {
    display: none;
  }
`;

const TabPanel = styled(StitchPanel)`
  gap: ${({ theme }) => theme.space[2]};

  @media (max-width: 700px) {
    padding: ${({ theme }) => theme.space[4]};
  }
`;

const FormTitle = styled(Heading)`
  && {
    margin: 0;
    color: var(--stitch-text);
    font-size: ${({ theme }) => theme.font.size.lg};
    line-height: ${({ theme }) => theme.font.leading.tight};
  }
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;

  @media (max-width: 480px) {
    & > button {
      width: 100%;
    }
  }
`;

export interface ProfileViewProps {
  readonly currentUser: AuthUser;
  readonly tab: ProfileTab;
  readonly onTabChange: (tab: ProfileTab) => void;
}

export function ProfileView({ currentUser, tab, onTabChange }: ProfileViewProps): ReactNode {
  const { t } = useI18n();
  const services = useProfileServices();

  const displayName = currentUser.displayName;
  const identityName = displayName ?? t('profile.noName');
  const avatarName = displayName ?? currentUser.email ?? '?';

  return (
    <Stack gap="space-5">
      <IdentityPanel data-testid="profile-identity">
        <AvatarFrame>
          <Avatar name={avatarName} size="lg" />
        </AvatarFrame>
        <IdentityText>
          <IdentityName>{identityName}</IdentityName>
          {currentUser.email === null ? null : (
            <IdentityEmail>
              <Mail aria-hidden="true" size={14} />
              {currentUser.email}
            </IdentityEmail>
          )}
        </IdentityText>
        {currentUser.emailVerified ? (
          <VerifiedBadge>
            <ShieldCheck aria-hidden="true" size={14} />
            {t('profile.email.verified')}
          </VerifiedBadge>
        ) : null}
      </IdentityPanel>

      <TabPanel>
        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (isProfileTab(value)) {
              onTabChange(value);
            }
          }}
          classNames={{
            list: 'profile-tabs-list',
            trigger: 'profile-tabs-trigger',
          }}
        >
          <Tabs.List>
            <Tabs.Trigger value={PROFILE_TAB}>{t('profile.tabs.profile')}</Tabs.Trigger>
            <Tabs.Trigger value={SECURITY_TAB}>{t('profile.tabs.security')}</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Panel value={PROFILE_TAB}>
            <Stack gap="space-4">
              <StitchSection>
                <StitchSectionHeading>
                  <StitchSectionIcon>
                    <Sparkles aria-hidden="true" size={16} />
                  </StitchSectionIcon>
                  <StitchSectionTitle as="h2">{t('profile.displayName.label')}</StitchSectionTitle>
                </StitchSectionHeading>
                <DisplayNameForm currentUser={currentUser} available={services !== null} />
              </StitchSection>
              <StitchSection data-testid="profile-email-section">
                <StitchSectionHeading>
                  <StitchSectionIcon>
                    <ShieldCheck aria-hidden="true" size={16} />
                  </StitchSectionIcon>
                  <Stack gap="space-1">
                    <StitchSectionTitle as="h2">{t('profile.email.label')}</StitchSectionTitle>
                    <Text color="color.text.muted" size="font.size.sm">
                      {t('profile.email.hint')}
                    </Text>
                  </Stack>
                </StitchSectionHeading>
                <Inline gap="space-2" align="center" wrap>
                  <Text>{currentUser.email ?? '—'}</Text>
                  <Badge variant={currentUser.emailVerified ? 'success' : 'warning'}>
                    {currentUser.emailVerified
                      ? t('profile.email.verified')
                      : t('profile.email.notVerified')}
                  </Badge>
                </Inline>
                {services === null ? null : <ChangeEmailForm currentEmail={currentUser.email} />}
              </StitchSection>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value={SECURITY_TAB}>
            <Stack gap="space-4">
              <StitchSection>
                <StitchSectionHeading>
                  <StitchSectionIcon>
                    <ShieldCheck aria-hidden="true" size={16} />
                  </StitchSectionIcon>
                  <Stack gap="space-1">
                    <StitchSectionTitle as="h2">{t('profile.password.title')}</StitchSectionTitle>
                    <Text color="color.text.muted" size="font.size.sm">
                      {t('profile.password.description')}
                    </Text>
                  </Stack>
                </StitchSectionHeading>
                {services === null ? (
                  <Text color="color.text.muted">{t('profile.error.generic')}</Text>
                ) : (
                  <ChangePasswordForm />
                )}
              </StitchSection>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </TabPanel>
    </Stack>
  );
}

function describeProfileError(error: AppError, t: I18nContextValue['t']): string {
  switch (error.code) {
    case ERROR_CODES.AUTH_INVALID_CREDENTIALS:
      return t('profile.error.invalidCredentials');
    case ERROR_CODES.AUTH_REQUIRES_RECENT_LOGIN:
      return t('profile.error.requiresRecentLogin');
    case ERROR_CODES.AUTH_EMAIL_ALREADY_IN_USE:
      return t('profile.error.emailInUse');
    case ERROR_CODES.AUTH_TOO_MANY_REQUESTS:
      return t('profile.error.tooManyRequests');
    default:
      return t('profile.error.generic');
  }
}

function DisplayNameForm({
  currentUser,
  available,
}: {
  readonly currentUser: AuthUser;
  readonly available: boolean;
}): ReactNode {
  const { t } = useI18n();
  const services = useProfileServices();
  const [value, setValue] = useState(currentUser.displayName ?? '');
  const [fieldErrors, setFieldErrors] = useState<UpdateUserProfileFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting || services === null) {
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    setSuccess(null);

    try {
      const result = await services.updateUserProfile({ displayName: value });
      if (result.status === 'ok') {
        setSuccess(t('profile.displayName.saved'));
      } else if (result.status === 'invalid-input') {
        setFieldErrors(result.fieldErrors);
      } else {
        setFormError(describeProfileError(result.error, t));
      }
    } catch (error) {
      setFormError(describeProfileError(toAppError(error), t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="space-3">
        <FormField>
          <FormFieldLabel>{t('profile.displayName.label')}</FormFieldLabel>
          <FormFieldDescription>{t('profile.displayName.hint')}</FormFieldDescription>
          <FormFieldControl>
            {(field) => (
              <Input
                {...field}
                name="displayName"
                autoComplete="name"
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                placeholder={t('profile.displayName.placeholder')}
                value={value}
                disabled={!available || submitting}
                onChange={(event) => setValue(event.target.value)}
              />
            )}
          </FormFieldControl>
          {fieldErrors.displayName === undefined ? null : (
            <FormFieldError>{localizeFieldError(t, fieldErrors.displayName)}</FormFieldError>
          )}
        </FormField>
        {formError === null ? null : (
          <Text role="alert" color="color.text.danger" size="font.size.sm">
            {formError}
          </Text>
        )}
        {success === null ? null : (
          <Text role="status" color="color.text.success" size="font.size.sm">
            {success}
          </Text>
        )}
        <FormActions>
          <Button
            type="submit"
            size="sm"
            variant="primary"
            loading={submitting}
            disabled={!available}
          >
            {submitting ? t('common.saving') : t('common.save')}
          </Button>
        </FormActions>
      </Stack>
    </form>
  );
}

function ChangeEmailForm({ currentEmail }: { readonly currentEmail: string | null }): ReactNode {
  const { t } = useI18n();
  const services = useProfileServices();
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ChangeUserEmailFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting || services === null) {
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    setSuccess(null);

    try {
      const result = await services.changeUserEmail({ email, currentPassword });
      if (result.status === 'ok') {
        setSuccess(t('profile.email.saved'));
        setEmail('');
        setCurrentPassword('');
      } else if (result.status === 'invalid-input') {
        setFieldErrors(result.fieldErrors);
      } else {
        setFormError(describeProfileError(result.error, t));
      }
    } catch (error) {
      setFormError(describeProfileError(toAppError(error), t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="space-3">
        <Stack gap="space-1">
          <FormTitle as="h3">{t('profile.email.changeTitle')}</FormTitle>
          <Text color="color.text.muted" size="font.size.sm">
            {t('profile.email.changeDescription')}
          </Text>
        </Stack>
        <FormField>
          <FormFieldLabel>{t('profile.email.newEmail')}</FormFieldLabel>
          <FormFieldControl>
            {(field) => (
              <Input
                {...field}
                type="email"
                name="email"
                inputMode="email"
                autoComplete="email"
                placeholder={currentEmail ?? ''}
                value={email}
                disabled={submitting}
                onChange={(event) => setEmail(event.target.value)}
              />
            )}
          </FormFieldControl>
          {fieldErrors.email === undefined ? null : (
            <FormFieldError>{localizeFieldError(t, fieldErrors.email)}</FormFieldError>
          )}
        </FormField>
        <FormField>
          <FormFieldLabel>{t('profile.email.currentPassword')}</FormFieldLabel>
          <FormFieldControl>
            {(field) => (
              <PasswordInput
                {...field}
                name="emailCurrentPassword"
                autoComplete="current-password"
                value={currentPassword}
                disabled={submitting}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            )}
          </FormFieldControl>
          {fieldErrors.currentPassword === undefined ? null : (
            <FormFieldError>{localizeFieldError(t, fieldErrors.currentPassword)}</FormFieldError>
          )}
        </FormField>
        {formError === null ? null : (
          <Text role="alert" color="color.text.danger" size="font.size.sm">
            {formError}
          </Text>
        )}
        {success === null ? null : (
          <Text role="status" color="color.text.success" size="font.size.sm">
            {success}
          </Text>
        )}
        <FormActions>
          <Button type="submit" size="sm" variant="primary" loading={submitting}>
            {t('profile.email.submit')}
          </Button>
        </FormActions>
      </Stack>
    </form>
  );
}

function ChangePasswordForm(): ReactNode {
  const { t } = useI18n();
  const services = useProfileServices();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ChangeUserPasswordFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting || services === null) {
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    setSuccess(null);

    try {
      const result = await services.changeUserPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (result.status === 'ok') {
        setSuccess(t('profile.password.saved'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else if (result.status === 'invalid-input') {
        setFieldErrors(result.fieldErrors);
      } else {
        setFormError(describeProfileError(result.error, t));
      }
    } catch (error) {
      setFormError(describeProfileError(toAppError(error), t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="space-3">
        <FormField>
          <FormFieldLabel>{t('profile.password.current')}</FormFieldLabel>
          <FormFieldControl>
            {(field) => (
              <PasswordInput
                {...field}
                name="currentPassword"
                autoComplete="current-password"
                value={currentPassword}
                disabled={submitting}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            )}
          </FormFieldControl>
          {fieldErrors.currentPassword === undefined ? null : (
            <FormFieldError>{localizeFieldError(t, fieldErrors.currentPassword)}</FormFieldError>
          )}
        </FormField>
        <FormField>
          <FormFieldLabel>{t('profile.password.new')}</FormFieldLabel>
          <FormFieldControl>
            {(field) => (
              <PasswordInput
                {...field}
                name="newPassword"
                autoComplete="new-password"
                value={newPassword}
                disabled={submitting}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            )}
          </FormFieldControl>
          {fieldErrors.newPassword === undefined ? null : (
            <FormFieldError>{localizeFieldError(t, fieldErrors.newPassword)}</FormFieldError>
          )}
        </FormField>
        <FormField>
          <FormFieldLabel>{t('profile.password.confirm')}</FormFieldLabel>
          <FormFieldControl>
            {(field) => (
              <PasswordInput
                {...field}
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                disabled={submitting}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            )}
          </FormFieldControl>
          {fieldErrors.confirmPassword === undefined ? null : (
            <FormFieldError>{localizeFieldError(t, fieldErrors.confirmPassword)}</FormFieldError>
          )}
        </FormField>
        {formError === null ? null : (
          <Text role="alert" color="color.text.danger" size="font.size.sm">
            {formError}
          </Text>
        )}
        {success === null ? null : (
          <Text role="status" color="color.text.success" size="font.size.sm">
            {success}
          </Text>
        )}
        <FormActions>
          <Button type="submit" size="sm" variant="primary" loading={submitting}>
            {t('profile.password.submit')}
          </Button>
        </FormActions>
      </Stack>
    </form>
  );
}
