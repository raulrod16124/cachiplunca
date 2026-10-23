import type {
  NotificationRepository,
  NotificationsErrorListener,
  NotificationsListener,
} from '../../application/ports';
import type { Notification } from '../../domain/notification';
import type { NotificationId, UserId } from '../../domain/shared';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';
import type { Unsubscribe } from '../../shared/types';

export class FakeNotificationRepository implements NotificationRepository {
  #notifications = new Map<string, Notification>();
  #watchers = new Map<string, Set<NotificationsListener>>();

  async create(notification: Notification): Promise<Notification> {
    this.#notifications.set(notification.id.value, notification);
    this.#notify(notification.recipientId.value);
    return notification;
  }

  async createMany(notifications: readonly Notification[]): Promise<void> {
    const recipientIds = new Set<string>();
    for (const notification of notifications) {
      this.#notifications.set(notification.id.value, notification);
      recipientIds.add(notification.recipientId.value);
    }
    for (const recipientId of recipientIds) {
      this.#notify(recipientId);
    }
  }

  async findById(id: NotificationId): Promise<Notification | null> {
    return this.#notifications.get(id.value) ?? null;
  }

  async listByRecipient(userId: UserId): Promise<Notification[]> {
    return this.#forRecipient(userId.value);
  }

  async markRead(id: NotificationId, readAt: Date): Promise<Notification> {
    const current = this.#notifications.get(id.value);
    if (current === undefined) {
      throw notFoundError(id);
    }

    const updated = buildNotification(() => current.markRead(readAt));
    this.#notifications.set(id.value, updated);
    this.#notify(updated.recipientId.value);
    return updated;
  }

  watchByRecipient(
    userId: UserId,
    listener: NotificationsListener,
    _onError?: NotificationsErrorListener,
  ): Unsubscribe {
    const normalized = userId.value;
    if (normalized.length === 0) {
      listener([]);
      return () => undefined;
    }

    let listeners = this.#watchers.get(normalized);
    if (listeners === undefined) {
      listeners = new Set();
      this.#watchers.set(normalized, listeners);
    }
    listeners.add(listener);
    listener(this.#forRecipient(normalized));

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.#watchers.delete(normalized);
      }
    };
  }

  list(): Notification[] {
    return [...this.#notifications.values()];
  }

  #forRecipient(userId: string): Notification[] {
    return [...this.#notifications.values()]
      .filter((notification) => notification.recipientId.value === userId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  #notify(userId: string): void {
    const listeners = this.#watchers.get(userId);
    if (listeners === undefined) {
      return;
    }

    const notifications = this.#forRecipient(userId);
    for (const listener of listeners) {
      listener(notifications);
    }
  }
}

function buildNotification(build: () => Notification): Notification {
  try {
    return build();
  } catch (error) {
    throw toValidationError(error);
  }
}

function toValidationError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  const message =
    error instanceof Error && error.message.length > 0
      ? error.message
      : 'Invalid notification input.';
  return createAppError('validation', ERROR_CODES.VALIDATION_INVALID_INPUT, message, {
    cause: error,
  });
}

function notFoundError(id: NotificationId): AppError {
  return createAppError(
    'notFound',
    ERROR_CODES.NOT_FOUND_RESOURCE,
    'The notification does not exist.',
    { details: { notificationId: id.value } },
  );
}
