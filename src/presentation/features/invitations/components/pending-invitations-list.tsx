import { Badge, Inline, Skeleton, Stack, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { Invitation } from '../../../../domain/invitation';
import type { MembershipRole } from '../../../../domain/membership';
import { ActionRow } from '../../../components/action-row';
import { Card } from '../../../components/card';
import { EmptyState } from '../../../components/empty-state';
import { ErrorState } from '../../../components/error-state';
import { LoadingState } from '../../../components/loading-state';
import { useI18n, type TranslationKey } from '../../../i18n';

const ROLE_KEYS: Record<MembershipRole, TranslationKey> = {
  owner: 'share.role.owner',
  editor: 'share.role.editor',
  viewer: 'share.role.viewer',
};

const Email = styled(Text)`
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
`;

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
      <LoadingState label={t('invitations.loading')}>
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
        title={t('invitations.error.title')}
        description={errorMessage ?? t('invitations.error.generic')}
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
                <Badge variant="neutral">{t(ROLE_KEYS[invitation.role])}</Badge>
                <Text color="color.text.muted">
                  {t('share.invite.expires', {
                    date: DATE_FORMATTER.format(invitation.expiresAt),
                  })}
                </Text>
              </Inline>
            }
          >
            <Email>{invitation.email}</Email>
          </ActionRow>
        </Card>
      ))}
    </List>
  );
}
