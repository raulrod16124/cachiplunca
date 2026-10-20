import { Avatar, Button, Heading, Inline, Stack, Text } from '@raulrod/ui';
import { Mail } from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { Invitation } from '../../../../domain/invitation';
import { useI18n } from '../../../i18n';

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
  readonly status: 'idle' | 'loading' | 'ready' | 'error';
  readonly invitations: readonly Invitation[];
  readonly loadError: string | null;
  readonly actionError: string | null;
  readonly needsVerification: boolean;
  readonly verificationSent: boolean;
  readonly acceptingId: string | null;
  readonly onAccept: (invitation: Invitation) => void;
  readonly onRetry: () => void;
  readonly onSendVerification: () => void;
}

export function PendingInvitationsPanel({
  status,
  invitations,
  loadError,
  actionError,
  needsVerification,
  verificationSent,
  acceptingId,
  onAccept,
  onRetry,
  onSendVerification,
}: PendingInvitationsPanelProps): ReactNode {
  const { t } = useI18n();

  if (status === 'idle' || status === 'loading') {
    return null;
  }

  if (status === 'error') {
    return (
      <Panel>
        <Text role="alert" color="color.text.danger">
          {loadError ?? t('workspaces.pending.error')}
        </Text>
        <Inline>
          <Button type="button" variant="outline" onClick={onRetry}>
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
              onClick={() => onAccept(invitation)}
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
      {needsVerification ? (
        <Inline gap="space-2" align="center" wrap>
          {verificationSent ? (
            <Text role="status" color="color.text.success">
              {t('workspaces.pending.verificationSent')}
            </Text>
          ) : (
            <Button type="button" variant="outline" onClick={onSendVerification}>
              {t('workspaces.pending.resendVerification')}
            </Button>
          )}
        </Inline>
      ) : null}
    </Panel>
  );
}
