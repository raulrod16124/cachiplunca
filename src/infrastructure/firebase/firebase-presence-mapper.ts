import { Presence } from '../../domain/collaboration';
import { Position, UserId, WorkspaceId } from '../../domain/shared';

export interface PresenceCursorDocument {
  readonly x: number;
  readonly y: number;
}

export interface PresenceDocument {
  readonly workspaceId: string;
  readonly userId: string;
  readonly lastSeenAt: Date;
  readonly cursor?: PresenceCursorDocument;
  readonly displayName?: string;
}

export function toPresenceDocument(presence: Presence): PresenceDocument {
  const cursor = presence.cursor;
  const displayName = presence.displayName;

  return {
    workspaceId: presence.workspaceId.value,
    userId: presence.userId.value,
    lastSeenAt: presence.lastSeenAt,
    ...(cursor === null ? {} : { cursor: { x: cursor.x, y: cursor.y } }),
    ...(displayName === null ? {} : { displayName }),
  };
}

export function fromPresenceDocument(data: unknown): Presence {
  if (!isRecord(data)) {
    throw new Error('Presence document must be an object');
  }

  return Presence.create({
    userId: UserId.create(readString(data.userId, 'userId')),
    workspaceId: WorkspaceId.create(readString(data.workspaceId, 'workspaceId')),
    lastSeenAt: readDate(data.lastSeenAt, 'lastSeenAt'),
    cursor: readCursor(data.cursor),
    displayName: readOptionalString(data.displayName, 'displayName'),
  });
}

function readCursor(value: unknown): Position | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!isRecord(value)) {
    throw new Error('Presence document field "cursor" must be an object');
  }

  return Position.create(readNumber(value.x, 'cursor.x'), readNumber(value.y, 'cursor.y'));
}

function readNumber(value: unknown, field: string): number {
  if (typeof value !== 'number') {
    throw new Error(`Presence document field "${field}" must be a number`);
  }
  return value;
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Presence document field "${field}" must be a string`);
  }
  return value;
}

function readOptionalString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return readString(value, field);
}

function readDate(value: unknown, field: string): Date {
  const date = toDate(value);
  if (date === undefined) {
    throw new Error(`Presence document field "${field}" must be a Date or Timestamp`);
  }
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Presence document field "${field}" must be a valid Date`);
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
