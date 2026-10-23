import { Badge, Inline, Stack, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { Notification } from '../../../../domain/notification';
import { Card } from '../../../components/card';
import { EmptyState } from '../../../components/empty-state';
import { ErrorState } from '../../../components/error-state';
import { LoadingState } from '../../../components/loading-state';
import { formatRelativeDate, useI18n } from '../../../i18n';

export type CommentNotificationsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface CommentNotificationsListProps {
  readonly status: CommentNotificationsStatus;
  readonly notifications: readonly Notification[];
  readonly errorMessage: string | null;
  readonly actionError: string | null;
  readonly onSelect: (notification: Notification) => void;
  readonly onRetry: () => void;
}

const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  margin: 0;
  padding: 0;
  list-style: none;
`;

const ItemButton = styled.button`
  display: flex;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radius.md};
  }
`;

const ItemCard = styled(Card)`
  display: block;
  width: 100%;

  &[data-unread='true'] {
    border-left: 3px solid ${({ theme }) => theme.color.focusRing};
  }
`;

export function CommentNotificationsList({
  status,
  notifications,
  errorMessage,
  actionError,
  onSelect,
  onRetry,
}: CommentNotificationsListProps): ReactNode {
  const { t, locale } = useI18n();

  if (status === 'idle' || status === 'loading') {
    return <LoadingState label={t('notifications.comments.loading')} />;
  }

  if (status === 'error') {
    return (
      <ErrorState
        title={t('notifications.comments.error.title')}
        description={errorMessage ?? t('notifications.error.generic')}
        actionLabel={t('common.retry')}
        onAction={onRetry}
      />
    );
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        title={t('notifications.comments.empty.title')}
        description={t('notifications.comments.empty.description')}
        titleAs="h3"
      />
    );
  }

  return (
    <Stack gap="space-3">
      <List>
        {notifications.map((notification) => {
          const unread = !notification.isRead();

          return (
            <Card key={notification.id.value} as="li" padding="none" data-unread={unread}>
              <ItemButton
                type="button"
                data-testid="comment-notification-row"
                aria-label={t('notifications.comment.accessibleLabel', {
                  actor: notification.actorName,
                  workspace: notification.workspaceName,
                  preview: notification.bodyPreview,
                  state: unread ? t('notifications.unread') : t('notifications.read'),
                })}
                onClick={() => onSelect(notification)}
              >
                <ItemCard variant={unread ? 'surface' : 'sunken'} padding="sm" data-unread={unread}>
                  <Stack gap="space-1">
                    <Text size="font.size.sm">
                      {t('notifications.comment.summary', {
                        actor: notification.actorName,
                        workspace: notification.workspaceName,
                      })}
                    </Text>
                    <Text color="color.text.muted" size="font.size.sm">
                      {notification.bodyPreview}
                    </Text>
                    <Inline gap="space-2" align="center" wrap>
                      <Text color="color.text.muted" size="font.size.xs">
                        {formatRelativeDate(notification.createdAt, locale)}
                      </Text>
                      <Badge variant={unread ? 'info' : 'neutral'}>
                        {unread ? t('notifications.unread') : t('notifications.read')}
                      </Badge>
                    </Inline>
                  </Stack>
                </ItemCard>
              </ItemButton>
            </Card>
          );
        })}
      </List>
      {actionError === null ? null : (
        <Text role="alert" color="color.text.danger">
          {actionError}
        </Text>
      )}
    </Stack>
  );
}
