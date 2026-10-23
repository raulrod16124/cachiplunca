import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';
import { FavoriteId } from './favorite-id';

export interface FavoriteProps {
  readonly id: FavoriteId;
  readonly userId: UserId;
  readonly workspaceId: WorkspaceId;
  readonly createdAt: Date;
}

export class Favorite {
  private readonly _id: FavoriteId;
  private readonly _userId: UserId;
  private readonly _workspaceId: WorkspaceId;
  private readonly _createdAt: Date;

  private constructor(props: FavoriteProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._workspaceId = props.workspaceId;
    this._createdAt = props.createdAt;
  }

  static create(props: {
    readonly userId: UserId;
    readonly workspaceId: WorkspaceId;
    readonly createdAt?: Date;
  }): Favorite {
    const createdAt = props.createdAt ?? new Date();
    Favorite.validateTimestamp(createdAt);

    return new Favorite({
      id: FavoriteId.forUserAndWorkspace(props.userId.value, props.workspaceId.value),
      userId: props.userId,
      workspaceId: props.workspaceId,
      createdAt,
    });
  }

  static fromPersistence(props: FavoriteProps): Favorite {
    const expectedId = FavoriteId.forUserAndWorkspace(props.userId.value, props.workspaceId.value);

    if (!props.id.equals(expectedId)) {
      throw new Error('Favorite id must match userId and workspaceId');
    }

    Favorite.validateTimestamp(props.createdAt);

    return new Favorite(props);
  }

  private static validateTimestamp(value: Date): void {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new Error('Favorite timestamp must be a valid Date');
    }
  }

  get id(): FavoriteId {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get workspaceId(): WorkspaceId {
    return this._workspaceId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  equals(other: Favorite): boolean {
    return (
      this._id.equals(other._id) &&
      this._userId.equals(other._userId) &&
      this._workspaceId.equals(other._workspaceId) &&
      this._createdAt.getTime() === other._createdAt.getTime()
    );
  }

  toJSON(): {
    id: string;
    userId: string;
    workspaceId: string;
    createdAt: string;
  } {
    return {
      id: this._id.value,
      userId: this._userId.value,
      workspaceId: this._workspaceId.value,
      createdAt: this._createdAt.toISOString(),
    };
  }
}
