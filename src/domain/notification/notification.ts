import { CommentId } from '../shared/value-objects/comment-id';
import { ElementId } from '../shared/value-objects/element-id';
import { NotificationId } from '../shared/value-objects/notification-id';
import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';

export const NOTIFICATION_BODY_PREVIEW_MAX_LENGTH = 140;
export const NOTIFICATION_ACTOR_NAME_MAX_LENGTH = 80;
export const NOTIFICATION_WORKSPACE_NAME_MAX_LENGTH = 100;

export type NotificationType = 'comment';

export interface NotificationProps {
  readonly id: NotificationId;
  readonly type: NotificationType;
  readonly recipientId: UserId;
  readonly workspaceId: WorkspaceId;
  readonly workspaceName: string;
  readonly elementId: ElementId;
  readonly commentId: CommentId;
  readonly actorId: UserId;
  readonly actorName: string;
  readonly bodyPreview: string;
  readonly createdAt: Date;
  readonly readAt: Date | undefined;
}

export class Notification {
  private readonly _id: NotificationId;
  private readonly _type: NotificationType;
  private readonly _recipientId: UserId;
  private readonly _workspaceId: WorkspaceId;
  private readonly _workspaceName: string;
  private readonly _elementId: ElementId;
  private readonly _commentId: CommentId;
  private readonly _actorId: UserId;
  private readonly _actorName: string;
  private readonly _bodyPreview: string;
  private readonly _createdAt: Date;
  private readonly _readAt: Date | undefined;

  private constructor(props: NotificationProps) {
    this._id = props.id;
    this._type = props.type;
    this._recipientId = props.recipientId;
    this._workspaceId = props.workspaceId;
    this._workspaceName = props.workspaceName;
    this._elementId = props.elementId;
    this._commentId = props.commentId;
    this._actorId = props.actorId;
    this._actorName = props.actorName;
    this._bodyPreview = props.bodyPreview;
    this._createdAt = props.createdAt;
    this._readAt = props.readAt;
  }

  static create(props: {
    readonly id: NotificationId;
    readonly type: NotificationType;
    readonly recipientId: UserId;
    readonly workspaceId: WorkspaceId;
    readonly workspaceName: string;
    readonly elementId: ElementId;
    readonly commentId: CommentId;
    readonly actorId: UserId;
    readonly actorName: string;
    readonly bodyPreview: string;
    readonly createdAt?: Date;
    readonly readAt?: Date;
  }): Notification {
    if (props.type !== 'comment') {
      throw new Error('Notification type must be comment');
    }
    if (props.recipientId.equals(props.actorId)) {
      throw new Error('A user cannot receive a notification for their own action');
    }

    const workspaceName = Notification.validateText(
      props.workspaceName,
      'Workspace name',
      NOTIFICATION_WORKSPACE_NAME_MAX_LENGTH,
    );
    const actorName = Notification.validateText(
      props.actorName,
      'Actor name',
      NOTIFICATION_ACTOR_NAME_MAX_LENGTH,
    );
    const bodyPreview = Notification.validateText(
      props.bodyPreview,
      'Body preview',
      NOTIFICATION_BODY_PREVIEW_MAX_LENGTH,
    );
    const createdAt = props.createdAt ?? new Date();
    Notification.validateTimestamp(createdAt, 'Created at');
    if (props.readAt !== undefined) {
      Notification.validateReadAt(props.readAt, createdAt);
    }

    return new Notification({
      id: props.id,
      type: props.type,
      recipientId: props.recipientId,
      workspaceId: props.workspaceId,
      workspaceName,
      elementId: props.elementId,
      commentId: props.commentId,
      actorId: props.actorId,
      actorName,
      bodyPreview,
      createdAt,
      readAt: props.readAt,
    });
  }

  markRead(readAt: Date = new Date()): Notification {
    if (this._readAt !== undefined) {
      return this;
    }

    Notification.validateReadAt(readAt, this._createdAt);

    return new Notification({
      id: this._id,
      type: this._type,
      recipientId: this._recipientId,
      workspaceId: this._workspaceId,
      workspaceName: this._workspaceName,
      elementId: this._elementId,
      commentId: this._commentId,
      actorId: this._actorId,
      actorName: this._actorName,
      bodyPreview: this._bodyPreview,
      createdAt: this._createdAt,
      readAt,
    });
  }

  isRead(): boolean {
    return this._readAt !== undefined;
  }

  private static validateText(value: string, label: string, maxLength: number): string {
    const normalized = typeof value === 'string' ? value.trim() : '';

    if (normalized.length === 0) {
      throw new Error(`${label} cannot be empty`);
    }
    if (normalized.length > maxLength) {
      throw new Error(`${label} cannot exceed ${maxLength} characters`);
    }

    return normalized;
  }

  private static validateTimestamp(value: Date, label: string): void {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new Error(`${label} must be a valid Date instance`);
    }
  }

  private static validateReadAt(readAt: Date, createdAt: Date): void {
    Notification.validateTimestamp(readAt, 'Read at');

    if (readAt.getTime() < createdAt.getTime()) {
      throw new Error('Read at cannot be before created at');
    }
  }

  get id(): NotificationId {
    return this._id;
  }

  get type(): NotificationType {
    return this._type;
  }

  get recipientId(): UserId {
    return this._recipientId;
  }

  get workspaceId(): WorkspaceId {
    return this._workspaceId;
  }

  get workspaceName(): string {
    return this._workspaceName;
  }

  get elementId(): ElementId {
    return this._elementId;
  }

  get commentId(): CommentId {
    return this._commentId;
  }

  get actorId(): UserId {
    return this._actorId;
  }

  get actorName(): string {
    return this._actorName;
  }

  get bodyPreview(): string {
    return this._bodyPreview;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get readAt(): Date | undefined {
    return this._readAt;
  }
}
