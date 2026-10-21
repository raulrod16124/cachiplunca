import { Badge, Inline, Skeleton, Stack, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { Invitation } from '../../../../domain/invitation';
import { ActionRow } from '../../../components/action-row';
import { Card } from '../../../components/card';
import { EmptyState } from '../../../components/empty-state';
import { ErrorState } from '../../../components/error-state';
import { LoadingState } from '../../../components/loading-state';
import { useI18n } from '../../../i18n';

export type PendingInvitationsStatus = 'loading' | 'error' | 'ready';

export interface PendingInvitationsListProps {
  readonly status: PendingInvitationsStatus;
  readonly invitations: readonly Invitation[];
  readonly errorMessage: string | null;
  readonly onRetry: () => void;
}

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
`;

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export function PendingInvitationsList({
  status,
  invitations,
  errorMessage,
  onRetry,
}: PendingInvitationsListProps): ReactNode {
  const { t } = useI18n();
  if (status === 'loading') {
    return (
      <LoadingState label="Loading pending invitations">
        <Stack gap="space-2">
          <Skeleton style={{ height: '24px', width: '60%' }} />
          <Skeleton style={{ height: '24px', width: '50%' }} />
        </Stack>
      </LoadingState>
    );
  }

  if (status === 'error') {
    return (
      <ErrorState
        title="Could not load invitations"
        description={errorMessage ?? 'Something went wrong.'}
        actionLabel={t('common.retry')}
        onAction={onRetry}
      />
    );
  }

  if (invitations.length === 0) {
    return <EmptyState title={t('share.invite.pendingEmpty')} titleAs="h3" />;
  }

  return (
    <List>
      {invitations.map((invitation) => (
        <Card key={invitation.id.value} as="li" padding="sm" data-testid="pending-invitation-row">
          <ActionRow
            wrap
            trailing={
              <Inline gap="space-2" align="center" wrap>
                <Badge variant="neutral">{invitation.role}</Badge>
                <Text color="color.text.muted">
                  {t('share.invite.expires', {
                    date: DATE_FORMATTER.format(invitation.expiresAt),
                  })}
                </Text>
              </Inline>
            }
          >
            <Text>{invitation.email}</Text>
          </ActionRow>
        </Card>
      ))}
    </List>
  );
}
