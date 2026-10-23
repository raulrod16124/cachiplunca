import {
  Button,
  FormField,
  FormFieldControl,
  FormFieldError,
  FormFieldLabel,
  Input,
  Radio,
  RadioGroup,
  Stack,
  Text,
} from '@raulrod/ui';
import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { InviteMember, InviteMemberFieldErrors } from '../../../../application/commands';
import type { Invitation } from '../../../../domain/invitation';
import { isValidRole, type MembershipRole } from '../../../../domain/membership';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { toAppError } from '../../../../shared/errors';
import { describeInviteMemberError } from '../invitation-error-messages';
import { localizeFieldError, localizeMessage, useI18n } from '../../../i18n';
import { defaultInviteRole, inviteRoleOptionsFor } from './invite-role-options';

export interface InvitedMemberResult {
  readonly invitation: Invitation;
  readonly token: string;
}

export interface InviteMemberFormProps {
  readonly workspaceId: string;
  readonly invitedBy: UserId;
  readonly availableRoles: readonly MembershipRole[];
  readonly inviteMember: InviteMember;
  readonly onInvited: (result: InvitedMemberResult) => void;
}

export function InviteMemberForm({
  workspaceId,
  invitedBy,
  availableRoles,
  inviteMember,
  onInvited,
}: InviteMemberFormProps): ReactNode {
  const { t } = useI18n();
  const roleLabelId = useId();
  const roleOptions = useMemo(() => inviteRoleOptionsFor(availableRoles), [availableRoles]);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<MembershipRole>(() =>
    defaultInviteRole(availableRoles),
  );
  const [fieldErrors, setFieldErrors] = useState<InviteMemberFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const role = availableRoles.includes(selectedRole)
    ? selectedRole
    : defaultInviteRole(availableRoles);

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
          setSelectedRole(defaultInviteRole(availableRoles));
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
          {fieldErrors.email !== undefined && (
            <FormFieldError>{localizeFieldError(t, fieldErrors.email)}</FormFieldError>
          )}
        </FormField>
        <FormField>
          <FormFieldLabel id={roleLabelId}>{t('share.invite.role')}</FormFieldLabel>
          <FormFieldControl>
            {(field) => (
              <RadioGroup
                {...field}
                aria-labelledby={roleLabelId}
                value={role}
                onValueChange={(value) => {
                  if (isValidRole(value)) {
                    setSelectedRole(value);
                  }
                }}
              >
                {roleOptions.map((option) => (
                  <Radio key={option.value} value={option.value}>
                    {t(option.labelKey)}
                    {' — '}
                    <Text size="font.size.sm" color="color.text.muted">
                      {t(option.descriptionKey)}
                    </Text>
                  </Radio>
                ))}
              </RadioGroup>
            )}
          </FormFieldControl>
          {fieldErrors.role !== undefined && (
            <FormFieldError>{localizeFieldError(t, fieldErrors.role)}</FormFieldError>
          )}
        </FormField>
        {formError !== null && (
          <Text role="alert" color="color.text.danger">
            {formError}
          </Text>
        )}
        <Button type="submit" variant="primary" loading={submitting}>
          {t('share.invite.submit')}
        </Button>
      </Stack>
    </form>
  );
}
