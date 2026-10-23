import { Notification, type NotificationType } from '../../domain/notification';
import { CommentId, ElementId, NotificationId, UserId, WorkspaceId } from '../../domain/shared';

export interface NotificationDocument {
  readonly id: string;
  readonly type: NotificationType;
  readonly recipientId: string;
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly elementId: string;
  readonly commentId: string;
  readonly actorId: string;
  readonly actorName: string;
  readonly bodyPreview: string;
  readonly createdAt: Date;
  readonly readAt?: Date;
}

export function toNotificationDocument(notification: Notification): NotificationDocument {
  return {
    id: notification.id.value,
    type: notification.type,
    recipientId: notification.recipientId.value,
    workspaceId: notification.workspaceId.value,
    workspaceName: notification.workspaceName,
    elementId: notification.elementId.value,
    commentId: notification.commentId.value,
    actorId: notification.actorId.value,
    actorName: notification.actorName,
    bodyPreview: notification.bodyPreview,
    createdAt: notification.createdAt,
    ...(notification.readAt === undefined ? {} : { readAt: notification.readAt }),
  };
}

export function fromNotificationDocument(data: unknown): Notification {
  if (!isRecord(data)) {
    throw new Error('Notification document must be an object');
  }

  if (data.type !== 'comment') {
    throw new Error('Notification document field "type" must be "comment"');
  }

  const readAt = data.readAt;

  return Notification.create({
    id: NotificationId.create(readString(data.id, 'id')),
    type: data.type,
    recipientId: UserId.create(readString(data.recipientId, 'recipientId')),
    workspaceId: WorkspaceId.create(readString(data.workspaceId, 'workspaceId')),
    workspaceName: readString(data.workspaceName, 'workspaceName'),
    elementId: ElementId.create(readString(data.elementId, 'elementId')),
    commentId: CommentId.create(readString(data.commentId, 'commentId')),
    actorId: UserId.create(readString(data.actorId, 'actorId')),
    actorName: readString(data.actorName, 'actorName'),
    bodyPreview: readString(data.bodyPreview, 'bodyPreview'),
    createdAt: readDate(data.createdAt, 'createdAt'),
    ...(readAt === undefined || readAt === null ? {} : { readAt: readDate(readAt, 'readAt') }),
  });
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Notification document field "${field}" must be a string`);
  }
  return value;
}

function readDate(value: unknown, field: string): Date {
  const date = toDate(value);
  if (date === undefined) {
    throw new Error(`Notification document field "${field}" must be a Date or Timestamp`);
  }
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Notification document field "${field}" must be a valid Date`);
  }
  return date;
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return value;
  }
  if (isRecord(value) && typeof value.toDate === 'function') {
    const date: unknown = value.toDate();
    if (date instanceof Date) {
      return date;
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
