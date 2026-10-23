import type { Notification } from '../../domain/notification';
import { UserId } from '../../domain/shared';
import { toAppError, type AppError } from '../../shared/errors';
import type { Unsubscribe } from '../../shared/types';
import type { NotificationRepository } from '../ports';

export type WatchNotificationsForUserListener = (notifications: readonly Notification[]) => void;

export type WatchNotificationsForUserErrorListener = (error: AppError) => void;

export type WatchNotificationsForUser = (
  userId: string,
  listener: WatchNotificationsForUserListener,
  onError?: WatchNotificationsForUserErrorListener,
) => Unsubscribe;

export function createWatchNotificationsForUser(
  repository: NotificationRepository,
): WatchNotificationsForUser {
  return (
    userId: string,
    listener: WatchNotificationsForUserListener,
    onError?: WatchNotificationsForUserErrorListener,
  ): Unsubscribe => {
    const normalized = typeof userId === 'string' ? userId.trim() : '';
    if (normalized.length === 0) {
      listener([]);
      return () => undefined;
    }

    return repository.watchByRecipient(
      UserId.create(normalized),
      (notifications) => listener(sortNotifications(notifications)),
      (error) => onError?.(toAppError(error)),
    );
  };
}

function sortNotifications(notifications: readonly Notification[]): Notification[] {
  return [...notifications].sort((left, right) => {
    const elapsed = right.createdAt.getTime() - left.createdAt.getTime();

    return elapsed === 0 ? right.id.value.localeCompare(left.id.value) : elapsed;
  });
}
