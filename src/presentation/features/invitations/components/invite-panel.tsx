import { Heading, Stack } from '@raulrod/ui';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { InviteMember } from '../../../../application/commands';
import type { ListPendingInvitations } from '../../../../application/queries';
import type { Invitation } from '../../../../domain/invitation';
import type { MembershipRole } from '../../../../domain/membership';
import type { UserId } from '../../../../domain/shared';
import { toAppError } from '../../../../shared/errors';
import { describePendingInvitationsError } from '../invitation-error-messages';
import { InvitationLink } from './invitation-link';
import { InviteMemberForm, type InvitedMemberResult } from './invite-member-form';
import { PendingInvitationsList, type PendingInvitationsStatus } from './pending-invitations-list';
import { useI18n } from '../../../i18n';

export interface InvitePanelProps {
  readonly active: boolean;
  readonly workspaceId: string;
  readonly invitedBy: UserId;
  readonly availableRoles: readonly MembershipRole[];
  readonly inviteMember: InviteMember;
  readonly listPendingInvitations: ListPendingInvitations;
}

export function InvitePanel({
  active,
  workspaceId,
  invitedBy,
  availableRoles,
  inviteMember,
  listPendingInvitations,
}: InvitePanelProps): ReactNode {
  const { t } = useI18n();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<PendingInvitationsStatus>('loading');
  const [invitations, setInvitations] = useState<readonly Invitation[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchPending = useCallback(async (): Promise<void> => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      const result = await listPendingInvitations(workspaceId);
      if (result.status === 'ok') {
        setInvitations(result.invitations);
        setStatus('ready');
        return;
      }
      setErrorMessage(describePendingInvitationsError(result.error));
      setStatus('error');
    } catch (error) {
      setErrorMessage(describePendingInvitationsError(toAppError(error)));
      setStatus('error');
    }
  }, [listPendingInvitations, workspaceId]);

  useEffect(() => {
    if (!active) {
      return;
    }
    void fetchPending();
  }, [active, fetchPending]);

  const handleInvited = useCallback(
    (result: InvitedMemberResult): void => {
      setToken(result.token);
      void fetchPending();
    },
    [fetchPending],
  );

  return (
    <Stack gap="space-6">
      <InviteMemberForm
        workspaceId={workspaceId}
        invitedBy={invitedBy}
        availableRoles={availableRoles}
        inviteMember={inviteMember}
        onInvited={handleInvited}
      />
      {token !== null && <InvitationLink token={token} />}
      <Stack gap="space-3">
        <Heading as="h3">{t('share.invite.pendingTitle')}</Heading>
        <PendingInvitationsList
          status={status}
          invitations={invitations}
          errorMessage={errorMessage}
          onRetry={() => void fetchPending()}
        />
      </Stack>
    </Stack>
  );
}
