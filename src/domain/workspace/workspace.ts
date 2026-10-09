import { WorkspaceId } from '../shared/value-objects/workspace-id';

export const WORKSPACE_NAME_MAX_LENGTH = 100;

export interface WorkspaceProps {
  readonly id: WorkspaceId;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly description?: string | null;
}

export class Workspace {
  private readonly _id: WorkspaceId;
  private readonly _name: string;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;
  private readonly _description: string | null;

  private constructor(props: WorkspaceProps) {
    this._id = props.id;
    this._name = props.name;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._description = props.description ?? null;
  }

  static create(props: {
    readonly id: WorkspaceId;
    readonly name: string;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
    readonly description?: string | null;
  }): Workspace {
    const name = Workspace.validateName(props.name);
    const now = new Date();
    const createdAt = props.createdAt ?? now;
    const updatedAt = props.updatedAt ?? createdAt;

    Workspace.validateTimestamps(createdAt, updatedAt);

    return new Workspace({
      id: props.id,
      name,
      createdAt,
      updatedAt,
      description: props.description,
    });
  }

  update(updates: {
    readonly name?: string;
    readonly description?: string | null;
    readonly updatedAt?: Date;
  }): Workspace {
    const name = updates.name !== undefined ? Workspace.validateName(updates.name) : this._name;
    const description = updates.description !== undefined ? updates.description : this._description;
    const updatedAt = updates.updatedAt ?? new Date();

    Workspace.validateTimestamps(this._createdAt, updatedAt);

    return new Workspace({
      id: this._id,
      name,
      createdAt: this._createdAt,
      updatedAt,
      description,
    });
  }

  private static validateName(name: string): string {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new Error('Workspace name cannot be empty');
    }
    if (trimmed.length > WORKSPACE_NAME_MAX_LENGTH) {
      throw new Error('Workspace name cannot exceed 100 characters');
    }
    return trimmed;
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

  get id(): WorkspaceId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get description(): string | null {
    return this._description;
  }

  toJSON(): {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    description: string | null;
  } {
    return {
      id: this._id.value,
      name: this._name,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      description: this._description,
    };
  }
}
