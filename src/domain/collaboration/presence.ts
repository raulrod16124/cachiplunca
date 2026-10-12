import { Position } from '../shared/value-objects/position';
import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';

export interface PresenceProps {
  readonly userId: UserId;
  readonly workspaceId: WorkspaceId;
  readonly lastSeenAt: Date;
  readonly cursor: Position | null;
}

export class Presence {
  private readonly _userId: UserId;
  private readonly _workspaceId: WorkspaceId;
  private readonly _lastSeenAt: Date;
  private readonly _cursor: Position | null;

  private constructor(props: PresenceProps) {
    this._userId = props.userId;
    this._workspaceId = props.workspaceId;
    this._lastSeenAt = props.lastSeenAt;
    this._cursor = props.cursor;
  }

  static create(props: {
    readonly userId: UserId;
    readonly workspaceId: WorkspaceId;
    readonly lastSeenAt?: Date;
    readonly cursor?: Position | null;
  }): Presence {
    const lastSeenAt = props.lastSeenAt ?? new Date();
    Presence.validateTimestamp(lastSeenAt);

    return new Presence({
      userId: props.userId,
      workspaceId: props.workspaceId,
      lastSeenAt,
      cursor: props.cursor ?? null,
    });
  }

  refresh(lastSeenAt: Date = new Date()): Presence {
    Presence.validateTimestamp(lastSeenAt);

    return new Presence({
      userId: this._userId,
      workspaceId: this._workspaceId,
      lastSeenAt,
      cursor: this._cursor,
    });
  }

  moveCursor(cursor: Position): Presence {
    if (this._cursor?.equals(cursor) ?? false) {
      return this;
    }

    return new Presence({
      userId: this._userId,
      workspaceId: this._workspaceId,
      lastSeenAt: new Date(),
      cursor,
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

  get cursor(): Position | null {
    return this._cursor;
  }

  isFor(workspaceId: WorkspaceId): boolean {
    return this._workspaceId.equals(workspaceId);
  }

  equals(other: Presence): boolean {
    return (
      this._userId.equals(other._userId) &&
      this._workspaceId.equals(other._workspaceId) &&
      this._lastSeenAt.getTime() === other._lastSeenAt.getTime() &&
      sameCursor(this._cursor, other._cursor)
    );
  }

  toJSON(): {
    userId: string;
    workspaceId: string;
    lastSeenAt: string;
    cursor: { x: number; y: number } | null;
  } {
    return {
      userId: this._userId.value,
      workspaceId: this._workspaceId.value,
      lastSeenAt: this._lastSeenAt.toISOString(),
      cursor: this._cursor === null ? null : this._cursor.toJSON(),
    };
  }
}

function sameCursor(a: Position | null, b: Position | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }

  return a.equals(b);
}
