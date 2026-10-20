import { CommentId } from '../shared/value-objects/comment-id';
import { ElementId } from '../shared/value-objects/element-id';
import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';

export const COMMENT_BODY_MAX_LENGTH = 4000;

export interface CommentProps {
  readonly id: CommentId;
  readonly workspaceId: WorkspaceId;
  readonly elementId: ElementId;
  readonly authorId: UserId;
  readonly body: string;
  readonly createdAt: Date;
  readonly resolvedAt: Date | undefined;
}

export class Comment {
  private readonly _id: CommentId;
  private readonly _workspaceId: WorkspaceId;
  private readonly _elementId: ElementId;
  private readonly _authorId: UserId;
  private readonly _body: string;
  private readonly _createdAt: Date;
  private readonly _resolvedAt: Date | undefined;

  private constructor(props: CommentProps) {
    this._id = props.id;
    this._workspaceId = props.workspaceId;
    this._elementId = props.elementId;
    this._authorId = props.authorId;
    this._body = props.body;
    this._createdAt = props.createdAt;
    this._resolvedAt = props.resolvedAt;
  }

  static create(props: {
    readonly id: CommentId;
    readonly workspaceId: WorkspaceId;
    readonly elementId: ElementId;
    readonly authorId: UserId;
    readonly body: string;
    readonly createdAt?: Date;
    readonly resolvedAt?: Date;
  }): Comment {
    const body = Comment.validateBody(props.body);
    const createdAt = props.createdAt ?? new Date();

    Comment.validateTimestamp(createdAt, 'Created at');
    if (props.resolvedAt !== undefined) {
      Comment.validateResolvedAt(props.resolvedAt, createdAt);
    }

    return new Comment({
      id: props.id,
      workspaceId: props.workspaceId,
      elementId: props.elementId,
      authorId: props.authorId,
      body,
      createdAt,
      resolvedAt: props.resolvedAt,
    });
  }

  resolve(resolvedAt: Date = new Date()): Comment {
    if (this._resolvedAt !== undefined) {
      throw new Error('Cannot resolve an already resolved comment');
    }

    Comment.validateResolvedAt(resolvedAt, this._createdAt);

    return new Comment({
      id: this._id,
      workspaceId: this._workspaceId,
      elementId: this._elementId,
      authorId: this._authorId,
      body: this._body,
      createdAt: this._createdAt,
      resolvedAt,
    });
  }

  private static validateBody(body: string): string {
    const normalized = typeof body === 'string' ? body.trim() : '';

    if (normalized.length === 0) {
      throw new Error('Comment body cannot be empty');
    }
    if (normalized.length > COMMENT_BODY_MAX_LENGTH) {
      throw new Error(`Comment body cannot exceed ${COMMENT_BODY_MAX_LENGTH} characters`);
    }

    return normalized;
  }

  private static validateTimestamp(value: Date, label: string): void {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new Error(`${label} must be a valid Date instance`);
    }
  }

  private static validateResolvedAt(resolvedAt: Date, createdAt: Date): void {
    Comment.validateTimestamp(resolvedAt, 'Resolved at');

    if (resolvedAt.getTime() < createdAt.getTime()) {
      throw new Error('Resolved at cannot be before created at');
    }
  }

  get id(): CommentId {
    return this._id;
  }

  get workspaceId(): WorkspaceId {
    return this._workspaceId;
  }

  get elementId(): ElementId {
    return this._elementId;
  }

  get authorId(): UserId {
    return this._authorId;
  }

  get body(): string {
    return this._body;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get resolvedAt(): Date | undefined {
    return this._resolvedAt;
  }

  isResolved(): boolean {
    return this._resolvedAt !== undefined;
  }
}
