import {
  Invitation,
  validateInvitationStatus,
  type InvitationStatus,
} from '../../domain/invitation';
import { validateRole, type MembershipRole } from '../../domain/membership';
import { InvitationId, UserId, WorkspaceId } from '../../domain/shared';

export interface InvitationDocument {
  readonly id: string;
  readonly workspaceId: string;
  readonly email: string;
  readonly role: MembershipRole;
  readonly tokenHash: string;
  readonly status: InvitationStatus;
  readonly invitedBy: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function toInvitationDocument(invitation: Invitation): InvitationDocument {
  return {
    id: invitation.id.value,
    workspaceId: invitation.workspaceId.value,
    email: invitation.email,
    role: invitation.role,
    tokenHash: invitation.tokenHash,
    status: invitation.status,
    invitedBy: invitation.invitedBy.value,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
  };
}

export function fromInvitationDocument(data: unknown): Invitation {
  if (!isRecord(data)) {
    throw new Error('Invitation document must be an object');
  }

  return Invitation.create({
    id: InvitationId.create(readString(data.id, 'id')),
    workspaceId: WorkspaceId.create(readString(data.workspaceId, 'workspaceId')),
    email: readString(data.email, 'email'),
    role: validateRole(data.role),
    tokenHash: readString(data.tokenHash, 'tokenHash'),
    status: validateInvitationStatus(data.status),
    invitedBy: UserId.create(readString(data.invitedBy, 'invitedBy')),
    expiresAt: readDate(data.expiresAt, 'expiresAt'),
    createdAt: readDate(data.createdAt, 'createdAt'),
    updatedAt: readDate(data.updatedAt, 'updatedAt'),
  });
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invitation document field "${field}" must be a string`);
  }
  return value;
}

function readDate(value: unknown, field: string): Date {
  const date = toDate(value);
  if (date === undefined) {
    throw new Error(`Invitation document field "${field}" must be a Date or Timestamp`);
  }
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invitation document field "${field}" must be a valid Date`);
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
