import { Badge, Inline, Skeleton, Stack, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { Invitation } from '../../../../domain/invitation';
import { EmptyState } from '../../../components/empty-state';
import { ErrorState } from '../../../components/error-state';
import { LoadingState } from '../../../components/loading-state';

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
        actionLabel="Retry"
        onAction={onRetry}
      />
    );
  }

  if (invitations.length === 0) {
    return <EmptyState title="No pending invitations." titleAs="h3" />;
  }

  return (
    <List>
      {invitations.map((invitation) => (
        <li key={invitation.id.value}>
          <Inline justify="between" align="center" gap="space-3" wrap>
            <Text>{invitation.email}</Text>
            <Inline gap="space-2" align="center">
              <Badge variant="neutral">{invitation.role}</Badge>
              <Text color="color.text.muted">
                Expires {DATE_FORMATTER.format(invitation.expiresAt)}
              </Text>
            </Inline>
          </Inline>
        </li>
      ))}
    </List>
  );
}
