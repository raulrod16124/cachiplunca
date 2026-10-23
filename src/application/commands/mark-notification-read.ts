import type { Notification } from '../../domain/notification';
import { NotificationId, UserId } from '../../domain/shared';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';
import type { NotificationRepository } from '../ports';
import { toValidationAppError } from './to-validation-app-error';

export interface MarkNotificationReadInput {
  readonly notificationId: string;
  readonly recipientId: string;
  readonly readAt?: Date;
}

export interface MarkNotificationReadDeps {
  readonly repository: NotificationRepository;
  readonly now?: () => Date;
}

export type MarkNotificationReadResult =
  | { readonly status: 'ok'; readonly notification: Notification }
  | { readonly status: 'error'; readonly error: AppError };

export type MarkNotificationRead = (
  input: MarkNotificationReadInput,
) => Promise<MarkNotificationReadResult>;

export function createMarkNotificationRead(deps: MarkNotificationReadDeps): MarkNotificationRead {
  return async (input: MarkNotificationReadInput): Promise<MarkNotificationReadResult> => {
    try {
      const notificationId = NotificationId.create(input.notificationId);
      const recipientId = UserId.create(input.recipientId);
      const current = await deps.repository.findById(notificationId);

      if (current === null) {
        return { status: 'error', error: notFoundError(input.notificationId) };
      }
      if (!current.recipientId.equals(recipientId)) {
        return { status: 'error', error: forbiddenError(input.notificationId) };
      }
      if (current.isRead()) {
        return { status: 'ok', notification: current };
      }

      const readAt = input.readAt ?? (deps.now === undefined ? new Date() : deps.now());
      const notification = await deps.repository.markRead(notificationId, readAt);
      return { status: 'ok', notification };
    } catch (error) {
      return { status: 'error', error: isAppError(error) ? error : toValidationAppError(error) };
    }
  };
}

function notFoundError(notificationId: string): AppError {
  return createAppError(
    'notFound',
    ERROR_CODES.NOT_FOUND_RESOURCE,
    'The notification does not exist.',
    { details: { notificationId } },
  );
}

function forbiddenError(notificationId: string): AppError {
  return createAppError(
    'authorization',
    ERROR_CODES.AUTH_FORBIDDEN,
    'Only the notification recipient can mark it as read.',
    { details: { notificationId } },
  );
}
