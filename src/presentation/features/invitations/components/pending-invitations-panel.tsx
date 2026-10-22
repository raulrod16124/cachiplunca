import { Avatar, Button, Inline, Stack, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { Invitation } from '../../../../domain/invitation';
import { EmptyState } from '../../../components/empty-state';
import { useI18n } from '../../../i18n';
import { PendingInvitationsList } from './pending-invitations-list';

const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const InvitationRow = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  flex-wrap: wrap;
  padding: ${({ theme }) => `${theme.space[3]} 0`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border.default};

  &:first-child {
    padding-top: 0;
  }

  &:last-child {
    padding-bottom: 0;
    border-bottom: none;
  }
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
    return (
      <PendingInvitationsList
        status="loading"
        invitations={[]}
        errorMessage={null}
        onRetry={onRetry}
      />
    );
  }

  if (status === 'error') {
    return (
      <PendingInvitationsList
        status="error"
        invitations={[]}
        errorMessage={loadError}
        onRetry={onRetry}
      />
    );
  }

  if (invitations.length === 0) {
    return <EmptyState title={t('shell.notifications.empty')} titleAs="h3" />;
  }

  return (
    <Stack gap="space-3">
      <List>
        {invitations.map((invitation) => {
          const workspaceName = t('workspaces.pending.workspaceLabel');
          return (
            <InvitationRow key={invitation.id.value} data-testid="pending-invitation-row">
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
      </List>
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
    </Stack>
  );
}
