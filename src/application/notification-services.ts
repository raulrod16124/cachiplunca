import type { MarkNotificationRead } from './commands';
import type { WatchNotificationsForUser } from './queries';
import type { NotifyComment } from './services/notify-comment';

export interface NotificationServices {
  readonly notifyComment: NotifyComment;
  readonly watchNotificationsForUser: WatchNotificationsForUser;
  readonly markNotificationRead: MarkNotificationRead;
}
