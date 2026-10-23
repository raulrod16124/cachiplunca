import type { Notification } from '../../domain/notification';
import type { NotificationId, UserId } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import type { Unsubscribe } from '../../shared/types';

export type NotificationsListener = (notifications: readonly Notification[]) => void;

export type NotificationsErrorListener = (error: AppError) => void;

export interface NotificationRepository {
  create(notification: Notification): Promise<Notification>;
  createMany(notifications: readonly Notification[]): Promise<void>;
  findById(id: NotificationId): Promise<Notification | null>;
  listByRecipient(userId: UserId): Promise<Notification[]>;
  markRead(id: NotificationId, readAt: Date): Promise<Notification>;
  watchByRecipient(
    userId: UserId,
    listener: NotificationsListener,
    onError?: NotificationsErrorListener,
  ): Unsubscribe;
}
