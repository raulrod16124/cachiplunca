import { GuestLink } from '../../domain/guest-link';
import { UserId, WorkspaceId } from '../../domain/shared';

export interface GuestLinkDocument {
  readonly workspaceId: string;
  readonly role: 'viewer';
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly revokedAt: Date | null;
}

export function toGuestLinkDocument(link: GuestLink): GuestLinkDocument {
  return {
    workspaceId: link.workspaceId.value,
    role: link.role,
    createdBy: link.createdBy.value,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
    revokedAt: link.revokedAt ?? null,
  };
}

export function fromGuestLinkDocument(tokenHash: string, data: unknown): GuestLink {
  if (!isRecord(data)) {
    throw new Error('Guest link document must be an object');
  }

  if (data.role !== 'viewer') {
    throw new Error('Guest link document field "role" must be "viewer"');
  }

  const revokedAt = readRevokedAt(data.revokedAt);

  return GuestLink.create({
    tokenHash,
    workspaceId: WorkspaceId.create(readString(data.workspaceId, 'workspaceId')),
    createdBy: UserId.create(readString(data.createdBy, 'createdBy')),
    createdAt: readDate(data.createdAt, 'createdAt'),
    updatedAt: readDate(data.updatedAt, 'updatedAt'),
    ...(revokedAt === null ? {} : { revokedAt }),
  });
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Guest link document field "${field}" must be a string`);
  }
  return value;
}

function readDate(value: unknown, field: string): Date {
  const date = toDate(value);
  if (date === undefined) {
    throw new Error(`Guest link document field "${field}" must be a Date or Timestamp`);
  }
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Guest link document field "${field}" must be a valid Date`);
  }
  return date;
}

function readRevokedAt(value: unknown): Date | null {
  if (value === undefined || value === null) {
    return null;
  }
  return readDate(value, 'revokedAt');
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
