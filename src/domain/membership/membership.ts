import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';
import { validateRole, type MembershipRole } from './role';

export interface MembershipProps {
  readonly userId: UserId;
  readonly workspaceId: WorkspaceId;
  readonly role: MembershipRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class Membership {
  private readonly _userId: UserId;
  private readonly _workspaceId: WorkspaceId;
  private readonly _role: MembershipRole;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(props: MembershipProps) {
    this._userId = props.userId;
    this._workspaceId = props.workspaceId;
    this._role = props.role;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: {
    readonly userId: UserId;
    readonly workspaceId: WorkspaceId;
    readonly role: MembershipRole;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
  }): Membership {
    const role = validateRole(props.role);
    const now = new Date();
    const createdAt = props.createdAt ?? now;
    const updatedAt = props.updatedAt ?? createdAt;

    Membership.validateTimestamps(createdAt, updatedAt);

    return new Membership({
      userId: props.userId,
      workspaceId: props.workspaceId,
      role,
      createdAt,
      updatedAt,
    });
  }

  updateRole(role: MembershipRole, updatedAt?: Date): Membership {
    const validatedRole = validateRole(role);
    const newUpdatedAt = updatedAt ?? new Date();

    Membership.validateTimestamps(this._createdAt, newUpdatedAt);

    return new Membership({
      userId: this._userId,
      workspaceId: this._workspaceId,
      role: validatedRole,
      createdAt: this._createdAt,
      updatedAt: newUpdatedAt,
    });
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

  get userId(): UserId {
    return this._userId;
  }

  get workspaceId(): WorkspaceId {
    return this._workspaceId;
  }

  get role(): MembershipRole {
    return this._role;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  isOwner(): boolean {
    return this._role === 'owner';
  }

  isEditor(): boolean {
    return this._role === 'editor';
  }

  isViewer(): boolean {
    return this._role === 'viewer';
  }

  canEdit(): boolean {
    return this._role === 'owner' || this._role === 'editor';
  }

  canView(): boolean {
    return true;
  }

  toJSON(): {
    userId: string;
    workspaceId: string;
    role: MembershipRole;
    createdAt: string;
    updatedAt: string;
  } {
    return {
      userId: this._userId.value,
      workspaceId: this._workspaceId.value,
      role: this._role,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
