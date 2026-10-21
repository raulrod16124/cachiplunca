import {
  Avatar,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { ShieldCheck, Sparkles } from '@raulrod/icons';
import { useState, type FormEvent, type ReactNode } from 'react';
import styled from 'styled-components';
import type {
  ChangeUserEmailFieldErrors,
  ChangeUserPasswordFieldErrors,
  UpdateUserProfileFieldErrors,
} from '../../../application/commands';
import type { AuthUser } from '../../../application/ports';
import { toAppError, ERROR_CODES, type AppError } from '../../../shared/errors';
import { localizeFieldError, useI18n, type I18nContextValue } from '../../i18n';
import { SettingsControls } from '../settings/settings-controls';
import { PasswordInput } from '../auth/password-input';
import { Card } from '../../components/card';
import { useProfileServices } from './profile-services-provider';

const PROFILE_TAB = 'profile';
const SECURITY_TAB = 'security';
const PREFERENCES_TAB = 'preferences';

type ProfileTab = typeof PROFILE_TAB | typeof SECURITY_TAB | typeof PREFERENCES_TAB;

const IdentityCard = styled(Card)`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.space[4]};
`;

const IdentityText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  min-width: 0;

  & > * {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};
  padding-top: ${({ theme }) => theme.space[5]};
  border-top: 1px solid ${({ theme }) => theme.color.border.default};

  &:first-of-type {
    padding-top: 0;
    border-top: none;
  }
`;

const SectionTitle = styled(Heading)`
  && {
    margin: 0;
    font-size: ${({ theme }) => theme.font.size.lg};
    line-height: ${({ theme }) => theme.font.leading.tight};
  }
`;

const SectionHeading = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[2]};

  svg {
    flex: none;
    margin-top: 2px;
    color: ${({ theme }) => theme.color.text.muted};
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

const DISPLAY_NAME_MAX_LENGTH = 80;

export interface ProfileModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly currentUser: AuthUser | null;
  readonly initialTab?: ProfileTab;
}

export function ProfileModal({
  open,
  onOpenChange,
  currentUser,
  initialTab = PROFILE_TAB,
}: ProfileModalProps): ReactNode {
  const services = useProfileServices();
  if (!open || currentUser === null) {
    return null;
  }
  return (
    <ProfileDialog
      currentUser={currentUser}
      onOpenChange={onOpenChange}
      initialTab={initialTab}
      servicesAvailable={services !== null}
    />
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

function ProfileDialog({
  currentUser,
  onOpenChange,
  initialTab,
  servicesAvailable,
}: {
  readonly currentUser: AuthUser;
  readonly onOpenChange: (open: boolean) => void;
  readonly initialTab: ProfileTab;
  readonly servicesAvailable: boolean;
}): ReactNode {
  const { t } = useI18n();
  const services = useProfileServices();
  const [tab, setTab] = useState<ProfileTab>(initialTab);

  const displayName = currentUser.displayName;
  const identityName = displayName ?? t('profile.noName');
  const avatarName = displayName ?? currentUser.email ?? '?';

  return (
    <Dialog open onOpenChange={onOpenChange} classNames={{ content: 'profile-dialog-content' }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('profile.title')}</DialogTitle>
          <DialogDescription>{t('profile.description')}</DialogDescription>
        </DialogHeader>

        <IdentityCard variant="sunken" padding="md">
          <Avatar name={avatarName} size="lg" />
          <IdentityText>
            <Text weight="font.weight.semibold" size="font.size.lg">
              {identityName}
            </Text>
            {currentUser.email === null ? null : (
              <Text color="color.text.muted" size="font.size.sm">
                {currentUser.email}
              </Text>
            )}
          </IdentityText>
        </IdentityCard>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as ProfileTab)}
          classNames={{
            list: 'profile-tabs-list',
            trigger: 'profile-tabs-trigger',
          }}
        >
          <Tabs.List>
            <Tabs.Trigger value={PROFILE_TAB}>{t('profile.tabs.profile')}</Tabs.Trigger>
            <Tabs.Trigger value={SECURITY_TAB}>{t('profile.tabs.security')}</Tabs.Trigger>
            <Tabs.Trigger value={PREFERENCES_TAB}>{t('profile.tabs.preferences')}</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Panel value={PROFILE_TAB}>
            <Stack gap="space-4">
              <Section>
                <SectionHeading>
                  <Sparkles aria-hidden="true" size={16} />
                  <SectionTitle as="h3">{t('profile.displayName.label')}</SectionTitle>
                </SectionHeading>
                <DisplayNameForm
                  currentUser={currentUser}
                  available={servicesAvailable && services !== null}
                />
              </Section>
              <Section>
                <SectionHeading>
                  <ShieldCheck aria-hidden="true" size={16} />
                  <Stack gap="space-1">
                    <SectionTitle as="h3">{t('profile.email.label')}</SectionTitle>
                    <Text color="color.text.muted" size="font.size.sm">
                      {t('profile.email.hint')}
                    </Text>
                  </Stack>
                </SectionHeading>
                <Inline gap="space-2" align="center" wrap>
                  <Text>{currentUser.email ?? '—'}</Text>
                  <Badge variant={currentUser.emailVerified ? 'success' : 'warning'}>
                    {currentUser.emailVerified
                      ? t('profile.email.verified')
                      : t('profile.email.notVerified')}
                  </Badge>
                </Inline>
                {services === null ? null : <ChangeEmailForm currentEmail={currentUser.email} />}
              </Section>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value={SECURITY_TAB}>
            <Stack gap="space-4">
              <Section>
                <SectionHeading>
                  <ShieldCheck aria-hidden="true" size={16} />
                  <Stack gap="space-1">
                    <SectionTitle as="h3">{t('profile.password.title')}</SectionTitle>
                    <Text color="color.text.muted" size="font.size.sm">
                      {t('profile.password.description')}
                    </Text>
                  </Stack>
                </SectionHeading>
                {services === null ? (
                  <Text color="color.text.muted">{t('profile.error.generic')}</Text>
                ) : (
                  <ChangePasswordForm />
                )}
              </Section>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value={PREFERENCES_TAB}>
            <SettingsControls />
          </Tabs.Panel>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
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
          <Heading as="h4">{t('profile.email.changeTitle')}</Heading>
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
