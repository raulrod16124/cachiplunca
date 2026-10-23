import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type {
  NotificationRepository,
  NotificationsErrorListener,
  NotificationsListener,
} from '../../application/ports';
import type { Notification } from '../../domain/notification';
import { NotificationId, type UserId } from '../../domain/shared';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';
import type { Unsubscribe } from '../../shared/types';
import { mapFirebaseError } from './firebase-error-mapper';
import { fromNotificationDocument, toNotificationDocument } from './firebase-notification-mapper';

const NOTIFICATIONS_COLLECTION = 'notifications';
const NOTIFICATIONS_LIMIT = 50;

export function createFirebaseNotificationRepository(db: Firestore): NotificationRepository {
  const notificationsCollection = collection(db, NOTIFICATIONS_COLLECTION);
  const notificationRef = (id: NotificationId) => doc(notificationsCollection, id.value);
  const recipientQuery = (userId: UserId) =>
    query(
      notificationsCollection,
      where('recipientId', '==', userId.value),
      orderBy('createdAt', 'desc'),
      limit(NOTIFICATIONS_LIMIT),
    );

  return {
    async create(notification: Notification): Promise<Notification> {
      await withMappedErrors(() =>
        setDoc(notificationRef(notification.id), toNotificationDocument(notification)),
      );
      return notification;
    },

    async createMany(notifications: readonly Notification[]): Promise<void> {
      if (notifications.length === 0) {
        return;
      }

      const batch = writeBatch(db);
      for (const notification of notifications) {
        batch.set(notificationRef(notification.id), toNotificationDocument(notification));
      }
      await withMappedErrors(() => batch.commit());
    },

    async findById(id: NotificationId): Promise<Notification | null> {
      const snapshot = await withMappedErrors(() => getDoc(notificationRef(id)));
      if (!snapshot.exists()) {
        return null;
      }
      return readNotification(snapshot.data());
    },

    async listByRecipient(userId: UserId): Promise<Notification[]> {
      const snapshot = await withMappedErrors(() => getDocs(recipientQuery(userId)));
      return snapshot.docs.map((document) => readNotification(document.data()));
    },

    async markRead(id: NotificationId, readAt: Date): Promise<Notification> {
      const reference = notificationRef(id);
      const snapshot = await withMappedErrors(() => getDoc(reference));
      if (!snapshot.exists()) {
        throw notFoundError(id);
      }

      const current = readNotification(snapshot.data());
      const updated = buildNotification(() => current.markRead(readAt));

      await withMappedErrors(() => updateDoc(reference, { readAt: updated.readAt }));
      return updated;
    },

    watchByRecipient(
      userId: UserId,
      listener: NotificationsListener,
      onError?: NotificationsErrorListener,
    ): Unsubscribe {
      return onSnapshot(
        recipientQuery(userId),
        (snapshot) => {
          try {
            listener(snapshot.docs.map((document) => readNotification(document.data())));
          } catch (error) {
            onError?.(toValidationError(error));
          }
        },
        (error: unknown) => {
          onError?.(mapFirebaseError(error));
        },
      );
    },
  };
}

function buildNotification(build: () => Notification): Notification {
  try {
    return build();
  } catch (error) {
    throw toValidationError(error);
  }
}

function readNotification(data: unknown): Notification {
  return buildNotification(() => fromNotificationDocument(data));
}

async function withMappedErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapFirebaseError(error);
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
