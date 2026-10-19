import { Badge, Button, Heading, Stack, Text } from '@raulrod/ui';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { AcceptInvitationById } from '../../../../application/commands';
import type { GetWorkspace, ListPendingInvitationsForUser } from '../../../../application/queries';
import type { Invitation } from '../../../../domain/invitation';
import { UserId } from '../../../../domain/shared';
import { toAppError } from '../../../../shared/errors';
import {
  describeAcceptInvitationError,
  describePendingInvitationsError,
} from '../../invitations/invitation-error-messages';

export interface PendingInvitationsPanelProps {
  readonly userId: string;
  readonly userEmail: string | null;
  readonly listPendingInvitationsForUser: ListPendingInvitationsForUser;
  readonly acceptInvitationById: AcceptInvitationById;
  readonly getWorkspace: GetWorkspace;
  readonly onAccepted: (workspaceId: string) => void;
}

type PanelStatus = 'idle' | 'loading' | 'ready' | 'error';

export function PendingInvitationsPanel({
  userId,
  userEmail,
  listPendingInvitationsForUser,
  acceptInvitationById,
  getWorkspace,
  onAccepted,
}: PendingInvitationsPanelProps): ReactNode {
  const [status, setStatus] = useState<PanelStatus>('idle');
  const [invitations, setInvitations] = useState<readonly Invitation[]>([]);
  const [workspaceNames, setWorkspaceNames] = useState<ReadonlyMap<string, string>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (userEmail === null) {
      setInvitations([]);
      setStatus('idle');
      return;
    }

    let active = true;
    setStatus('loading');
    setLoadError(null);

    void (async () => {
      try {
        const result = await listPendingInvitationsForUser(userEmail);
        if (!active) {
          return;
        }
        if (result.status !== 'ok') {
          setLoadError(describePendingInvitationsError(result.error));
          setStatus('error');
          return;
        }

        setInvitations(result.invitations);
        setStatus('ready');

        const names = await Promise.all(
          result.invitations.map(async (invitation) => {
            const workspace = await getWorkspace(invitation.workspaceId.value);
            return [
              invitation.workspaceId.value,
              workspace.status === 'ok' ? workspace.workspace.name : null,
            ] as const;
          }),
        );
        if (!active) {
          return;
        }
        setWorkspaceNames(
          new Map(names.filter((entry): entry is readonly [string, string] => entry[1] !== null)),
        );
      } catch (error) {
        if (!active) {
          return;
        }
        setLoadError(describePendingInvitationsError(toAppError(error)));
        setStatus('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [getWorkspace, listPendingInvitationsForUser, reloadToken, userEmail]);

  const handleAccept = useCallback(
    async (invitation: Invitation): Promise<void> => {
      if (userEmail === null || acceptingId !== null) {
        return;
      }

      setAcceptingId(invitation.id.value);
      setActionError(null);

      try {
        const result = await acceptInvitationById({
          invitationId: invitation.id,
          userId: UserId.create(userId),
          userEmail,
        });

        if (result.status === 'ok') {
          onAccepted(result.workspaceId.value);
          return;
        }

        setActionError(
          result.status === 'invalid-input'
            ? 'This invitation link is not valid.'
            : describeAcceptInvitationError(result.error),
        );
      } catch (error) {
        setActionError(describeAcceptInvitationError(toAppError(error)));
      } finally {
        setAcceptingId(null);
      }
    },
    [acceptInvitationById, acceptingId, onAccepted, userEmail, userId],
  );

  if (userEmail === null || status === 'idle' || status === 'loading') {
    return null;
  }

  if (status === 'error') {
    return (
      <Stack gap="space-2">
        <Text role="alert" color="color.text.danger">
          {loadError ?? 'We could not load your invitations. Please try again.'}
        </Text>
        <Button type="button" variant="secondary" onClick={() => setReloadToken((t) => t + 1)}>
          Retry
        </Button>
      </Stack>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Stack gap="space-3">
      <Heading as="h2">Pending invitations</Heading>
      {invitations.map((invitation) => {
        const workspaceName = workspaceNames.get(invitation.workspaceId.value);
        return (
          <Stack key={invitation.id.value} gap="space-2">
            <Text>
              {workspaceName ?? 'A workspace'} invited you as <Badge>{invitation.role}</Badge>
            </Text>
            <Button
              type="button"
              variant="primary"
              loading={acceptingId === invitation.id.value}
              disabled={acceptingId !== null && acceptingId !== invitation.id.value}
              onClick={() => void handleAccept(invitation)}
            >
              Accept invitation
            </Button>
          </Stack>
        );
      })}
      {actionError !== null && (
        <Text role="alert" color="color.text.danger">
          {actionError}
        </Text>
      )}
    </Stack>
  );
}
