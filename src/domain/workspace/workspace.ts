import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';

export const WORKSPACE_NAME_MAX_LENGTH = 100;

export const WORKSPACE_TYPES = ['general', 'work', 'travel', 'tasks', 'ideas'] as const;

export type WorkspaceType = (typeof WORKSPACE_TYPES)[number];

export interface WorkspaceProps {
  readonly id: WorkspaceId;
  readonly name: string;
  readonly createdBy: UserId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastActivityAt: Date;
  readonly description?: string | null;
  readonly coverImageUrl?: string | null;
  readonly coverImageStoragePath?: string | null;
  readonly type?: WorkspaceType;
}

interface CoverImage {
  readonly url: string | null;
  readonly storagePath: string | null;
}

export class Workspace {
  private readonly _id: WorkspaceId;
  private readonly _name: string;
  private readonly _createdBy: UserId;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;
  private readonly _lastActivityAt: Date;
  private readonly _description: string | null;
  private readonly _coverImageUrl: string | null;
  private readonly _coverImageStoragePath: string | null;
  private readonly _type: WorkspaceType;

  private constructor(props: WorkspaceProps) {
    this._id = props.id;
    this._name = props.name;
    this._createdBy = props.createdBy;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._lastActivityAt = props.lastActivityAt;
    this._description = props.description ?? null;
    this._coverImageUrl = props.coverImageUrl ?? null;
    this._coverImageStoragePath = props.coverImageStoragePath ?? null;
    this._type = Workspace.validateType(props.type);
  }

  static create(props: {
    readonly id: WorkspaceId;
    readonly name: string;
    readonly createdBy: UserId;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
    readonly lastActivityAt?: Date;
    readonly description?: string | null;
    readonly coverImageUrl?: string | null;
    readonly coverImageStoragePath?: string | null;
    readonly type?: WorkspaceType;
  }): Workspace {
    const name = Workspace.validateName(props.name);
    const now = new Date();
    const createdAt = props.createdAt ?? now;
    const updatedAt = props.updatedAt ?? createdAt;
    const lastActivityAt = props.lastActivityAt ?? updatedAt;
    const cover = Workspace.validateCoverImage(
      props.coverImageUrl,
      props.coverImageStoragePath,
      props.id,
    );
    const type = Workspace.validateType(props.type);

    Workspace.validateTimestamps(createdAt, updatedAt, lastActivityAt);

    return new Workspace({
      id: props.id,
      name,
      createdBy: props.createdBy,
      createdAt,
      updatedAt,
      lastActivityAt,
      description: props.description,
      coverImageUrl: cover.url,
      coverImageStoragePath: cover.storagePath,
      type,
    });
  }

  update(updates: {
    readonly name?: string;
    readonly description?: string | null;
    readonly coverImageUrl?: string | null;
    readonly coverImageStoragePath?: string | null;
    readonly updatedAt?: Date;
    readonly type?: WorkspaceType;
  }): Workspace {
    const name = updates.name !== undefined ? Workspace.validateName(updates.name) : this._name;
    const description = updates.description !== undefined ? updates.description : this._description;
    const updatedAt = updates.updatedAt ?? new Date();
    const cover = Workspace.validateCoverImage(
      updates.coverImageUrl !== undefined ? updates.coverImageUrl : this._coverImageUrl,
      updates.coverImageStoragePath !== undefined
        ? updates.coverImageStoragePath
        : this._coverImageStoragePath,
      this._id,
    );
    const type = updates.type !== undefined ? Workspace.validateType(updates.type) : this._type;

    Workspace.validateTimestamps(this._createdAt, updatedAt, this._lastActivityAt);

    return new Workspace({
      id: this._id,
      name,
      createdBy: this._createdBy,
      createdAt: this._createdAt,
      updatedAt,
      lastActivityAt: this._lastActivityAt,
      description,
      coverImageUrl: cover.url,
      coverImageStoragePath: cover.storagePath,
      type,
    });
  }

  touchActivity(at?: Date): Workspace {
    const lastActivityAt = at ?? new Date();

    Workspace.validateTimestamps(this._createdAt, this._updatedAt, lastActivityAt);

    return new Workspace({
      id: this._id,
      name: this._name,
      createdBy: this._createdBy,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      lastActivityAt,
      description: this._description,
      coverImageUrl: this._coverImageUrl,
      coverImageStoragePath: this._coverImageStoragePath,
      type: this._type,
    });
  }

  private static validateName(name: string): string {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new Error('Board name cannot be empty');
    }
    if (trimmed.length > WORKSPACE_NAME_MAX_LENGTH) {
      throw new Error('Board name cannot exceed 100 characters');
    }
    return trimmed;
  }

  private static validateCoverImage(
    url: string | null | undefined,
    storagePath: string | null | undefined,
    workspaceId: WorkspaceId,
  ): CoverImage {
    if (url === undefined || url === null) {
      if (storagePath === undefined || storagePath === null) {
        return { url: null, storagePath: null };
      }
      throw new Error('Cover image URL and storage path must be provided together');
    }

    if (storagePath === undefined || storagePath === null) {
      throw new Error('Cover image URL and storage path must be provided together');
    }

    const trimmedUrl = url.trim();
    const trimmedPath = storagePath.trim();

    if (!isValidCoverImageUrl(trimmedUrl)) {
      throw new Error('Cover image URL must be a valid HTTP or HTTPS URL');
    }

    const prefix = `workspaces/${workspaceId.value}/images/`;
    if (!trimmedPath.startsWith(prefix) || trimmedPath.length === prefix.length) {
      throw new Error('Cover image storage path must belong to the workspace images folder');
    }

    return { url: trimmedUrl, storagePath: trimmedPath };
  }

  private static validateTimestamps(createdAt: Date, updatedAt: Date, lastActivityAt: Date): void {
    if (
      !(createdAt instanceof Date) ||
      !(updatedAt instanceof Date) ||
      !(lastActivityAt instanceof Date)
    ) {
      throw new Error('Timestamps must be valid Date instances');
    }
    if (
      isNaN(createdAt.getTime()) ||
      isNaN(updatedAt.getTime()) ||
      isNaN(lastActivityAt.getTime())
    ) {
      throw new Error('Timestamps must be valid Date instances');
    }
    if (updatedAt < createdAt) {
      throw new Error('Updated at cannot be before created at');
    }
    if (lastActivityAt < createdAt) {
      throw new Error('Last activity at cannot be before created at');
    }
  }

  get id(): WorkspaceId {
    return this._id;
  }

  get name(): string {
    return this._name;
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

  get lastActivityAt(): Date {
    return this._lastActivityAt;
  }

  get activityAt(): Date {
    return this._lastActivityAt;
  }

  get description(): string | null {
    return this._description;
  }

  get coverImageUrl(): string | null {
    return this._coverImageUrl;
  }

  get coverImageStoragePath(): string | null {
    return this._coverImageStoragePath;
  }

  get type(): WorkspaceType {
    return this._type;
  }

  toJSON(): {
    id: string;
    name: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    lastActivityAt: string;
    description: string | null;
    coverImageUrl: string | null;
    coverImageStoragePath: string | null;
    type: WorkspaceType;
  } {
    return {
      id: this._id.value,
      name: this._name,
      createdBy: this._createdBy.value,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      lastActivityAt: this._lastActivityAt.toISOString(),
      description: this._description,
      coverImageUrl: this._coverImageUrl,
      coverImageStoragePath: this._coverImageStoragePath,
      type: this._type,
    };
  }

  private static validateType(type?: WorkspaceType): WorkspaceType {
    if (type === undefined || type === null) {
      return 'general';
    }

    if (!WORKSPACE_TYPES.includes(type)) {
      throw new Error('Invalid workspace type');
    }

    return type;
  }
}

function isValidCoverImageUrl(value: string): boolean {
  if (value.length === 0) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
