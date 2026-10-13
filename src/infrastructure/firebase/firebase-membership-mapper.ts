import { Membership, validateRole, type MembershipRole } from '../../domain/membership';
import { UserId, WorkspaceId } from '../../domain/shared';

export interface MembershipDocument {
  readonly userId: string;
  readonly workspaceId: string;
  readonly role: MembershipRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function toMembershipDocument(membership: Membership): MembershipDocument {
  return {
    userId: membership.userId.value,
    workspaceId: membership.workspaceId.value,
    role: membership.role,
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt,
  };
}

export function fromMembershipDocument(data: unknown): Membership {
  if (!isRecord(data)) {
    throw new Error('Membership document must be an object');
  }

  return Membership.create({
    userId: UserId.create(readString(data.userId, 'userId')),
    workspaceId: WorkspaceId.create(readString(data.workspaceId, 'workspaceId')),
    role: validateRole(data.role),
    createdAt: readDate(data.createdAt, 'createdAt'),
    updatedAt: readDate(data.updatedAt, 'updatedAt'),
  });
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Membership document field "${field}" must be a string`);
  }
  return value;
}

function readDate(value: unknown, field: string): Date {
  const date = toDate(value);
  if (date === undefined) {
    throw new Error(`Membership document field "${field}" must be a Date or Timestamp`);
  }
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Membership document field "${field}" must be a valid Date`);
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
