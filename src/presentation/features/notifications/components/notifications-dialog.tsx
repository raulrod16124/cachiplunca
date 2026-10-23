import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Tabs,
  VisuallyHidden,
} from '@raulrod/ui';
import { Bell } from '@raulrod/icons';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import type { Notification } from '../../../../domain/notification';
import { useI18n } from '../../../i18n';
import { PendingInvitationsPanel } from '../../invitations/components/pending-invitations-panel';
import { useNotifications } from '../notifications-provider';
import { CommentNotificationsList } from './comment-notifications-list';

const INVITATIONS_TAB = 'invitations';
const COMMENTS_TAB = 'comments';

const Trigger = styled(Dialog.Trigger)`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ theme }) => theme.space[10]};
  height: ${({ theme }) => theme.space[10]};
  padding: 0;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  color: ${({ theme }) => theme.color.text.primary};
  cursor: pointer;
  transition:
    background-color ${({ theme }) => theme.motion.duration.fast}
      ${({ theme }) => theme.motion.easing.standard},
    color ${({ theme }) => theme.motion.duration.fast}
      ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    background: var(--cach-control-hover);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
`;

const BadgeSlot = styled.span`
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  transform: translate(35%, -25%);
`;

const Content = styled(DialogContent)`
  && {
    max-width: 36rem;
  }
`;

export interface NotificationsDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function NotificationsDialog({ open, onOpenChange }: NotificationsDialogProps): ReactNode {
  const { t } = useI18n();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [tab, setTab] = useState<string>(INVITATIONS_TAB);
  const count = notifications.unreadCount;
  const label =
    count > 0 ? t('shell.notifications.labelWithCount', { count }) : t('shell.notifications.label');

  useEffect(() => {
    if (!open) {
      return;
    }

    if (
      notifications.invitations.unreadCount > 0 ||
      !notifications.commentsSupported ||
      notifications.commentNotifications.length === 0
    ) {
      setTab(INVITATIONS_TAB);
      return;
    }

    setTab(notifications.commentUnreadCount > 0 ? COMMENTS_TAB : INVITATIONS_TAB);
  }, [
    notifications.commentNotifications.length,
    notifications.commentUnreadCount,
    notifications.commentsSupported,
    notifications.invitations.unreadCount,
    open,
  ]);

  const selectNotification = (notification: Notification): void => {
    notifications.markRead(notification);
    onOpenChange(false);

    const params = new URLSearchParams({
      elementId: notification.elementId.value,
      commentId: notification.commentId.value,
    });
    navigate(`/workspaces/${notification.workspaceId.value}?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Trigger aria-label={label} data-testid="notifications-button">
        <Bell aria-hidden="true" size={20} />
        {count > 0 ? (
          <BadgeSlot>
            <Badge variant="info" aria-hidden="true">
              {count}
            </Badge>
          </BadgeSlot>
        ) : null}
      </Trigger>
      <VisuallyHidden aria-live="polite">{label}</VisuallyHidden>
      <Content>
        <DialogHeader>
          <DialogTitle>{t('shell.notifications.title')}</DialogTitle>
          <DialogDescription>{t('shell.notifications.description')}</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <Tabs.List>
            <Tabs.Trigger value={INVITATIONS_TAB}>
              {t('notifications.tabs.invitations')}
            </Tabs.Trigger>
            {notifications.commentsSupported ? (
              <Tabs.Trigger value={COMMENTS_TAB}>{t('notifications.tabs.comments')}</Tabs.Trigger>
            ) : null}
          </Tabs.List>
          <Tabs.Panel value={INVITATIONS_TAB}>
            <PendingInvitationsPanel
              status={notifications.invitations.status}
              invitations={notifications.invitations.invitations}
              loadError={notifications.invitations.loadError}
              actionError={notifications.invitations.actionError}
              needsVerification={notifications.invitations.needsVerification}
              verificationSent={notifications.invitations.verificationSent}
              acceptingId={notifications.invitations.acceptingId}
              onAccept={notifications.invitations.accept}
              onRetry={notifications.invitations.retry}
              onSendVerification={notifications.invitations.sendVerification}
            />
          </Tabs.Panel>
          {notifications.commentsSupported ? (
            <Tabs.Panel value={COMMENTS_TAB}>
              <CommentNotificationsList
                status={notifications.commentStatus}
                notifications={notifications.commentNotifications}
                errorMessage={notifications.loadError}
                actionError={notifications.actionError}
                onSelect={selectNotification}
                onRetry={notifications.retry}
              />
            </Tabs.Panel>
          ) : null}
        </Tabs>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t('common.close')}
          </Button>
        </DialogFooter>
      </Content>
    </Dialog>
  );
}
