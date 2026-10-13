import { InvitationId } from '../shared/value-objects/invitation-id';
import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';
import { validateRole, type MembershipRole } from '../membership/role';
import { validateInvitationStatus, type InvitationStatus } from './invitation-status';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface InvitationProps {
  readonly id: InvitationId;
  readonly workspaceId: WorkspaceId;
  readonly email: string;
  readonly role: MembershipRole;
  readonly tokenHash: string;
  readonly status: InvitationStatus;
  readonly invitedBy: UserId;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class Invitation {
  private readonly _id: InvitationId;
  private readonly _workspaceId: WorkspaceId;
  private readonly _email: string;
  private readonly _role: MembershipRole;
  private readonly _tokenHash: string;
  private readonly _status: InvitationStatus;
  private readonly _invitedBy: UserId;
  private readonly _expiresAt: Date;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(props: InvitationProps) {
    this._id = props.id;
    this._workspaceId = props.workspaceId;
    this._email = props.email;
    this._role = props.role;
    this._tokenHash = props.tokenHash;
    this._status = props.status;
    this._invitedBy = props.invitedBy;
    this._expiresAt = props.expiresAt;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: {
    readonly id: InvitationId;
    readonly workspaceId: WorkspaceId;
    readonly email: string;
    readonly role: MembershipRole;
    readonly tokenHash: string;
    readonly invitedBy: UserId;
    readonly expiresAt: Date;
    readonly status?: InvitationStatus;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
  }): Invitation {
    const role = validateRole(props.role);
    const email = Invitation.normalizeEmail(props.email);
    const tokenHash = Invitation.validateTokenHash(props.tokenHash);
    const status = validateInvitationStatus(props.status ?? 'pending');
    const now = new Date();
    const createdAt = props.createdAt ?? now;
    const updatedAt = props.updatedAt ?? createdAt;
    const expiresAt = props.expiresAt;

    Invitation.validateTimestamps(createdAt, updatedAt);
    Invitation.validateExpiresAt(expiresAt, createdAt);

    return new Invitation({
      id: props.id,
      workspaceId: props.workspaceId,
      email,
      role,
      tokenHash,
      status,
      invitedBy: props.invitedBy,
      expiresAt,
      createdAt,
      updatedAt,
    });
  }

  accept(updatedAt?: Date): Invitation {
    return this.transition('accepted', updatedAt);
  }

  revoke(updatedAt?: Date): Invitation {
    return this.transition('revoked', updatedAt);
  }

  private transition(status: InvitationStatus, updatedAt?: Date): Invitation {
    if (this._status !== 'pending') {
      const action = status === 'accepted' ? 'accept' : 'revoke';
      throw new Error(`Cannot ${action} an invitation with status ${this._status}`);
    }

    const newUpdatedAt = updatedAt ?? new Date();
    Invitation.validateTimestamps(this._createdAt, newUpdatedAt);

    return new Invitation({
      id: this._id,
      workspaceId: this._workspaceId,
      email: this._email,
      role: this._role,
      tokenHash: this._tokenHash,
      status,
      invitedBy: this._invitedBy,
      expiresAt: this._expiresAt,
      createdAt: this._createdAt,
      updatedAt: newUpdatedAt,
    });
  }

  private static normalizeEmail(email: string): string {
    const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (normalized.length === 0) {
      throw new Error('Invitation email cannot be empty');
    }
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new Error('Invalid invitation email');
    }
    return normalized;
  }

  private static validateTokenHash(tokenHash: string): string {
    const normalized = typeof tokenHash === 'string' ? tokenHash.trim() : '';
    if (normalized.length === 0) {
      throw new Error('Invitation token hash cannot be empty');
    }
    return normalized;
  }

  private static validateTimestamps(createdAt: Date, updatedAt: Date): void {
    if (!(createdAt instanceof Date) || !(updatedAt instanceof Date)) {
      throw new Error('Timestamps must be valid Date instances');
    }
    if (isNaN(createdAt.getTime()) || isNaN(updatedAt.getTime())) {
      throw new Error('Timestamps must be valid Date instances');
    }
    if (updatedAt < createdAt) {
      throw new Error('Updated at cannot be before created at');
    }
  }

  private static validateExpiresAt(expiresAt: Date, createdAt: Date): void {
    if (!(expiresAt instanceof Date) || isNaN(expiresAt.getTime())) {
      throw new Error('Expires at must be a valid Date instance');
    }
    if (expiresAt.getTime() <= createdAt.getTime()) {
      throw new Error('Expires at must be after created at');
    }
  }

  get id(): InvitationId {
    return this._id;
  }

  get workspaceId(): WorkspaceId {
    return this._workspaceId;
  }

  get email(): string {
    return this._email;
  }

  get role(): MembershipRole {
    return this._role;
  }

  get tokenHash(): string {
    return this._tokenHash;
  }

  get status(): InvitationStatus {
    return this._status;
  }

  get invitedBy(): UserId {
    return this._invitedBy;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  isPending(): boolean {
    return this._status === 'pending';
  }

  isExpired(now: Date = new Date()): boolean {
    return this._expiresAt.getTime() <= now.getTime();
  }

  isForEmail(email: string): boolean {
    return this._email === Invitation.normalizeEmail(email);
  }

  toJSON(): {
    id: string;
    workspaceId: string;
    email: string;
    role: MembershipRole;
    tokenHash: string;
    status: InvitationStatus;
    invitedBy: string;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
  } {
    return {
      id: this._id.value,
      workspaceId: this._workspaceId.value,
      email: this._email,
      role: this._role,
      tokenHash: this._tokenHash,
      status: this._status,
      invitedBy: this._invitedBy.value,
      expiresAt: this._expiresAt.toISOString(),
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
