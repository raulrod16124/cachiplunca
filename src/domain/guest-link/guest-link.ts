import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';

export const GUEST_LINK_ROLE = 'viewer' as const;
export const GUEST_LINK_TOKEN_HASH_LENGTH = 64;

export type GuestLinkRole = typeof GUEST_LINK_ROLE;

export interface GuestLinkProps {
  readonly tokenHash: string;
  readonly workspaceId: WorkspaceId;
  readonly createdBy: UserId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly revokedAt: Date | undefined;
}

export class GuestLink {
  private readonly _tokenHash: string;
  private readonly _workspaceId: WorkspaceId;
  private readonly _createdBy: UserId;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;
  private readonly _revokedAt: Date | undefined;

  private constructor(props: GuestLinkProps) {
    this._tokenHash = props.tokenHash;
    this._workspaceId = props.workspaceId;
    this._createdBy = props.createdBy;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._revokedAt = props.revokedAt;
  }

  static create(props: {
    readonly tokenHash: string;
    readonly workspaceId: WorkspaceId;
    readonly createdBy: UserId;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
    readonly revokedAt?: Date;
  }): GuestLink {
    const tokenHash = GuestLink.validateTokenHash(props.tokenHash);
    const now = new Date();
    const createdAt = props.createdAt ?? now;
    const updatedAt = props.updatedAt ?? createdAt;

    GuestLink.validateTimestamp(createdAt, 'Created at');
    GuestLink.validateTimestamp(updatedAt, 'Updated at');

    if (updatedAt.getTime() < createdAt.getTime()) {
      throw new Error('Updated at cannot be before created at');
    }

    if (props.revokedAt !== undefined) {
      GuestLink.validateRevokedAt(props.revokedAt, createdAt);
    }

    return new GuestLink({
      tokenHash,
      workspaceId: props.workspaceId,
      createdBy: props.createdBy,
      createdAt,
      updatedAt,
      revokedAt: props.revokedAt,
    });
  }

  revoke(revokedAt: Date = new Date()): GuestLink {
    if (this._revokedAt !== undefined) {
      return this;
    }

    GuestLink.validateRevokedAt(revokedAt, this._createdAt);

    return new GuestLink({
      tokenHash: this._tokenHash,
      workspaceId: this._workspaceId,
      createdBy: this._createdBy,
      createdAt: this._createdAt,
      updatedAt: revokedAt,
      revokedAt,
    });
  }

  isActive(): boolean {
    return this._revokedAt === undefined;
  }

  private static validateTokenHash(tokenHash: string): string {
    const normalized = typeof tokenHash === 'string' ? tokenHash.trim().toLowerCase() : '';

    if (!/^[a-f0-9]{64}$/.test(normalized)) {
      throw new Error('Guest link token hash must be a SHA-256 hex string');
    }

    return normalized;
  }

  private static validateTimestamp(value: Date, label: string): void {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new Error(`${label} must be a valid Date instance`);
    }
  }

  private static validateRevokedAt(revokedAt: Date, createdAt: Date): void {
    GuestLink.validateTimestamp(revokedAt, 'Revoked at');

    if (revokedAt.getTime() < createdAt.getTime()) {
      throw new Error('Revoked at cannot be before created at');
    }
  }

  get tokenHash(): string {
    return this._tokenHash;
  }

  get workspaceId(): WorkspaceId {
    return this._workspaceId;
  }

  get createdBy(): UserId {
    return this._createdBy;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get revokedAt(): Date | undefined {
    return this._revokedAt;
  }

  get role(): GuestLinkRole {
    return GUEST_LINK_ROLE;
  }
}
