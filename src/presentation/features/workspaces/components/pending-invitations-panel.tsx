import { Avatar, Button, Heading, Inline, Stack, Text } from '@raulrod/ui';
import { Mail } from '@raulrod/icons';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import type {
  AcceptInvitationById,
  RefreshUser,
  SendEmailVerification,
} from '../../../../application/commands';
import type { ListPendingInvitationsForUser } from '../../../../application/queries';
import type { Invitation } from '../../../../domain/invitation';
import { UserId } from '../../../../domain/shared';
import { ERROR_CODES, toAppError } from '../../../../shared/errors';
import { localizeMessage, useI18n } from '../../../i18n';
import {
  describeAcceptInvitationError,
  describePendingInvitationsError,
} from '../../invitations/invitation-error-messages';

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[4]};
  border: 1px solid ${({ theme }) => theme.color.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.background.info};
`;

const PanelHeading = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[2]};
`;

const InvitationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  flex-wrap: wrap;
  padding: ${({ theme }) => `${theme.space[3]} 0 0`};
  border-top: 1px solid ${({ theme }) => theme.color.border.default};
`;

const InvitationIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 0;
`;

export interface PendingInvitationsPanelProps {
  readonly userId: string;
  readonly userEmail: string | null;
  readonly userEmailVerified: boolean;
  readonly listPendingInvitationsForUser: ListPendingInvitationsForUser;
  readonly acceptInvitationById: AcceptInvitationById;
  readonly sendEmailVerification?: SendEmailVerification;
  readonly refreshUser?: RefreshUser;
  readonly onAccepted: (workspaceId: string) => void;
}

type PanelStatus = 'idle' | 'loading' | 'ready' | 'error';

export function PendingInvitationsPanel({
  userId,
  userEmail,
  userEmailVerified,
  listPendingInvitationsForUser,
  acceptInvitationById,
  sendEmailVerification,
  refreshUser,
  onAccepted,
}: PendingInvitationsPanelProps): ReactNode {
  const { t } = useI18n();
  const [status, setStatus] = useState<PanelStatus>('idle');
  const [invitations, setInvitations] = useState<readonly Invitation[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(!userEmailVerified);
  const [verificationSent, setVerificationSent] = useState(false);
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
          setLoadError(localizeMessage(t, describePendingInvitationsError(result.error)));
          setStatus('error');
          return;
        }

        setInvitations(result.invitations);
        setStatus('ready');
      } catch (error) {
        if (!active) {
          return;
        }
        setLoadError(localizeMessage(t, describePendingInvitationsError(toAppError(error))));
        setStatus('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [listPendingInvitationsForUser, reloadToken, userEmail]);

  const handleAccept = useCallback(
    async (invitation: Invitation): Promise<void> => {
      if (userEmail === null || acceptingId !== null) {
        return;
      }

      setAcceptingId(invitation.id.value);
      setActionError(null);

      try {
        let verified = userEmailVerified;
        if (refreshUser !== undefined) {
          const refreshed = await refreshUser();
          if (refreshed.status === 'ok') {
            verified = refreshed.user.emailVerified;
            setNeedsVerification(!verified);
          }
        }

        const result = await acceptInvitationById({
          invitationId: invitation.id,
          userId: UserId.create(userId),
          userEmail,
          userEmailVerified: verified,
        });

        if (result.status === 'ok') {
          onAccepted(result.workspaceId.value);
          return;
        }

        if (result.status === 'error') {
          setNeedsVerification(result.error.code === ERROR_CODES.INVITATION_EMAIL_NOT_VERIFIED);
        }

        setActionError(
          result.status === 'invalid-input'
            ? t('errors.invitationLinkInvalid')
            : localizeMessage(t, describeAcceptInvitationError(result.error)),
        );
      } catch (error) {
        setActionError(localizeMessage(t, describeAcceptInvitationError(toAppError(error))));
      } finally {
        setAcceptingId(null);
      }
    },
    [
      acceptInvitationById,
      acceptingId,
      onAccepted,
      refreshUser,
      userEmail,
      userEmailVerified,
      userId,
    ],
  );

  const handleSendVerification = async (): Promise<void> => {
    if (sendEmailVerification === undefined) {
      return;
    }
    const result = await sendEmailVerification();
    if (result.status === 'ok') {
      setVerificationSent(true);
      setActionError(null);
    }
  };

  if (userEmail === null || status === 'idle' || status === 'loading') {
    return null;
  }

  if (status === 'error') {
    return (
      <Panel>
        <Text role="alert" color="color.text.danger">
          {loadError ?? t('workspaces.pending.error')}
        </Text>
        <Inline>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setReloadToken((token) => token + 1)}
          >
            {t('workspaces.pending.retry')}
          </Button>
        </Inline>
      </Panel>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Panel>
      <PanelHeading>
        <Mail aria-hidden="true" size={18} />
        <Stack gap="space-1">
          <Heading as="h2">{t('workspaces.pending.title')}</Heading>
          <Text color="color.text.muted" size="font.size.sm">
            {t('workspaces.pending.description')}
          </Text>
        </Stack>
      </PanelHeading>
      {invitations.map((invitation) => {
        const workspaceName = t('workspaces.pending.workspaceLabel');
        return (
          <InvitationRow key={invitation.id.value}>
            <InvitationIdentity>
              <Avatar name={workspaceName} size="sm" />
              <Stack gap="space-1">
                <Text>
                  {t('workspaces.pending.invited', {
                    workspace: workspaceName,
                    role: invitation.role,
                  })}
                </Text>
              </Stack>
            </InvitationIdentity>
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={acceptingId === invitation.id.value}
              disabled={acceptingId !== null && acceptingId !== invitation.id.value}
              onClick={() => void handleAccept(invitation)}
            >
              {t('workspaces.pending.accept')}
            </Button>
          </InvitationRow>
        );
      })}
      {actionError === null ? null : (
        <Text role="alert" color="color.text.danger">
          {actionError}
        </Text>
      )}
      {needsVerification && sendEmailVerification !== undefined ? (
        <Inline gap="space-2" align="center" wrap>
          {verificationSent ? (
            <Text role="status" color="color.text.success">
              {t('workspaces.pending.verificationSent')}
            </Text>
          ) : (
            <Button type="button" variant="secondary" onClick={() => void handleSendVerification()}>
              {t('workspaces.pending.resendVerification')}
            </Button>
          )}
        </Inline>
      ) : null}
    </Panel>
  );
}
