import type { Notification } from '../../../domain/notification';

export function notificationHref(notification: Notification): string {
  const params = new URLSearchParams({
    elementId: notification.elementId.value,
    commentId: notification.commentId.value,
  });

  return `/workspaces/${notification.workspaceId.value}?${params.toString()}`;
}
