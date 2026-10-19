import {
  Button,
  FormField,
  FormFieldControl,
  FormFieldError,
  FormFieldLabel,
  Input,
  Select,
  Stack,
  Text,
} from '@raulrod/ui';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { InviteMember, InviteMemberFieldErrors } from '../../../../application/commands';
import type { Invitation } from '../../../../domain/invitation';
import type { MembershipRole } from '../../../../domain/membership';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { toAppError } from '../../../../shared/errors';
import { describeInviteMemberError } from '../invitation-error-messages';
import { localizeMessage, useI18n, type TranslationKey } from '../../../i18n';

const ROLE_OPTIONS: readonly { readonly value: MembershipRole; readonly label: TranslationKey }[] =
  [
    { value: 'editor', label: 'share.role.editor' },
    { value: 'viewer', label: 'share.role.viewer' },
    { value: 'owner', label: 'share.role.owner' },
  ];

export interface InvitedMemberResult {
  readonly invitation: Invitation;
  readonly token: string;
}

export interface InviteMemberFormProps {
  readonly workspaceId: string;
  readonly invitedBy: UserId;
  readonly inviteMember: InviteMember;
  readonly onInvited: (result: InvitedMemberResult) => void;
}

export function InviteMemberForm({
  workspaceId,
  invitedBy,
  inviteMember,
  onInvited,
}: InviteMemberFormProps): ReactNode {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MembershipRole>('editor');
  const [fieldErrors, setFieldErrors] = useState<InviteMemberFieldErrors>({});
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
      const result = await inviteMember({
        workspaceId: WorkspaceId.create(workspaceId),
        email,
        role,
        invitedBy,
      });
      switch (result.status) {
        case 'ok':
          setEmail('');
          setRole('editor');
          onInvited({ invitation: result.invitation, token: result.token });
          break;
        case 'invalid-input':
          setFieldErrors(result.fieldErrors);
          break;
        case 'error':
          setFormError(localizeMessage(t, describeInviteMemberError(result.error)));
          break;
      }
    } catch (error) {
      setFormError(localizeMessage(t, describeInviteMemberError(toAppError(error))));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="space-4">
        <FormField>
          <FormFieldLabel>{t('share.invite.email')}</FormFieldLabel>
          <FormFieldControl>
            {(field) => (
              <Input
                {...field}
                name="email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            )}
          </FormFieldControl>
          {fieldErrors.email !== undefined && <FormFieldError>{fieldErrors.email}</FormFieldError>}
        </FormField>
        <FormField>
          <FormFieldLabel>{t('share.invite.role')}</FormFieldLabel>
          <FormFieldControl>
            {(field) => (
              <Select value={role} onValueChange={(value) => setRole(value as MembershipRole)}>
                <Select.Trigger {...field} aria-label={t('share.invite.role')}>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {ROLE_OPTIONS.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {t(option.label)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            )}
          </FormFieldControl>
          {fieldErrors.role !== undefined && <FormFieldError>{fieldErrors.role}</FormFieldError>}
        </FormField>
        {formError !== null && (
          <Text role="alert" color="color.text.danger">
            {formError}
          </Text>
        )}
        <Button type="submit" loading={submitting}>
          {t('share.invite.submit')}
        </Button>
      </Stack>
    </form>
  );
}
