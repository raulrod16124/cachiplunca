import { Presence } from '../../domain/collaboration';
import { UserId, WorkspaceId } from '../../domain/shared';

export interface PresenceDocument {
  readonly workspaceId: string;
  readonly userId: string;
  readonly lastSeenAt: Date;
}

export function toPresenceDocument(presence: Presence): PresenceDocument {
  return {
    workspaceId: presence.workspaceId.value,
    userId: presence.userId.value,
    lastSeenAt: presence.lastSeenAt,
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
  });
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Presence document field "${field}" must be a string`);
  }
  return value;
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
