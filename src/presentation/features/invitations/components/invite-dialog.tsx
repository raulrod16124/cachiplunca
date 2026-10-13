import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Heading,
  Stack,
} from '@raulrod/ui';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { InviteMember } from '../../../../application/commands';
import type { ListPendingInvitations } from '../../../../application/queries';
import type { Invitation } from '../../../../domain/invitation';
import type { UserId } from '../../../../domain/shared';
import { toAppError } from '../../../../shared/errors';
import { describePendingInvitationsError } from '../invitation-error-messages';
import { InvitationLink } from './invitation-link';
import { InviteMemberForm, type InvitedMemberResult } from './invite-member-form';
import { PendingInvitationsList, type PendingInvitationsStatus } from './pending-invitations-list';

export interface InviteDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly workspaceId: string;
  readonly invitedBy: UserId;
  readonly inviteMember: InviteMember;
  readonly listPendingInvitations: ListPendingInvitations;
}

export function InviteDialog({
  open,
  onOpenChange,
  workspaceId,
  invitedBy,
  inviteMember,
  listPendingInvitations,
}: InviteDialogProps): ReactNode {
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
    if (!open) {
      return;
    }
    setToken(null);
    void fetchPending();
  }, [open, fetchPending]);

  const handleInvited = useCallback(
    (result: InvitedMemberResult): void => {
      setToken(result.token);
      void fetchPending();
    },
    [fetchPending],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite people</DialogTitle>
          <DialogDescription>Invite a collaborator to this workspace by email.</DialogDescription>
        </DialogHeader>
        <Stack gap="space-6">
          <InviteMemberForm
            workspaceId={workspaceId}
            invitedBy={invitedBy}
            inviteMember={inviteMember}
            onInvited={handleInvited}
          />
          {token !== null && <InvitationLink token={token} />}
          <Stack gap="space-3">
            <Heading as="h2">Pending invitations</Heading>
            <PendingInvitationsList
              status={status}
              invitations={invitations}
              errorMessage={errorMessage}
              onRetry={() => void fetchPending()}
            />
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
