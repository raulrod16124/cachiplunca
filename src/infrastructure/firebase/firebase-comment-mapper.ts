import { Comment } from '../../domain/comment';
import { CommentId, ElementId, UserId, WorkspaceId } from '../../domain/shared';

export interface CommentDocument {
  readonly id: string;
  readonly workspaceId: string;
  readonly elementId: string;
  readonly authorId: string;
  readonly body: string;
  readonly createdAt: Date;
  readonly editedAt?: Date;
  readonly resolvedAt?: Date;
}

export function toCommentDocument(comment: Comment): CommentDocument {
  return {
    id: comment.id.value,
    workspaceId: comment.workspaceId.value,
    elementId: comment.elementId.value,
    authorId: comment.authorId.value,
    body: comment.body,
    createdAt: comment.createdAt,
    ...(comment.editedAt === undefined ? {} : { editedAt: comment.editedAt }),
    ...(comment.resolvedAt === undefined ? {} : { resolvedAt: comment.resolvedAt }),
  };
}

export function fromCommentDocument(data: unknown): Comment {
  if (!isRecord(data)) {
    throw new Error('Comment document must be an object');
  }

  const resolvedAt = data.resolvedAt;
  const editedAt = data.editedAt;

  return Comment.create({
    id: CommentId.create(readString(data.id, 'id')),
    workspaceId: WorkspaceId.create(readString(data.workspaceId, 'workspaceId')),
    elementId: ElementId.create(readString(data.elementId, 'elementId')),
    authorId: UserId.create(readString(data.authorId, 'authorId')),
    body: readString(data.body, 'body'),
    createdAt: readDate(data.createdAt, 'createdAt'),
    ...(editedAt === undefined || editedAt === null
      ? {}
      : { editedAt: readDate(editedAt, 'editedAt') }),
    ...(resolvedAt === undefined || resolvedAt === null
      ? {}
      : { resolvedAt: readDate(resolvedAt, 'resolvedAt') }),
  });
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Comment document field "${field}" must be a string`);
  }
  return value;
}

function readDate(value: unknown, field: string): Date {
  const date = toDate(value);
  if (date === undefined) {
    throw new Error(`Comment document field "${field}" must be a Date or Timestamp`);
  }
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Comment document field "${field}" must be a valid Date`);
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
