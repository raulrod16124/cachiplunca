import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';

export interface PresenceProps {
  readonly userId: UserId;
  readonly workspaceId: WorkspaceId;
  readonly lastSeenAt: Date;
}

export class Presence {
  private readonly _userId: UserId;
  private readonly _workspaceId: WorkspaceId;
  private readonly _lastSeenAt: Date;

  private constructor(props: PresenceProps) {
    this._userId = props.userId;
    this._workspaceId = props.workspaceId;
    this._lastSeenAt = props.lastSeenAt;
  }

  static create(props: {
    readonly userId: UserId;
    readonly workspaceId: WorkspaceId;
    readonly lastSeenAt?: Date;
  }): Presence {
    const lastSeenAt = props.lastSeenAt ?? new Date();
    Presence.validateTimestamp(lastSeenAt);

    return new Presence({
      userId: props.userId,
      workspaceId: props.workspaceId,
      lastSeenAt,
    });
  }

  refresh(lastSeenAt: Date = new Date()): Presence {
    Presence.validateTimestamp(lastSeenAt);

    return new Presence({
      userId: this._userId,
      workspaceId: this._workspaceId,
      lastSeenAt,
    });
  }

  private static validateTimestamp(value: Date): void {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('Presence timestamp must be a valid Date');
    }
  }

  get userId(): UserId {
    return this._userId;
  }

  get workspaceId(): WorkspaceId {
    return this._workspaceId;
  }

  get lastSeenAt(): Date {
    return this._lastSeenAt;
  }

  isFor(workspaceId: WorkspaceId): boolean {
    return this._workspaceId.equals(workspaceId);
  }

  equals(other: Presence): boolean {
    return (
      this._userId.equals(other._userId) &&
      this._workspaceId.equals(other._workspaceId) &&
      this._lastSeenAt.getTime() === other._lastSeenAt.getTime()
    );
  }

  toJSON(): {
    userId: string;
    workspaceId: string;
    lastSeenAt: string;
  } {
    return {
      userId: this._userId.value,
      workspaceId: this._workspaceId.value,
      lastSeenAt: this._lastSeenAt.toISOString(),
    };
  }
}
