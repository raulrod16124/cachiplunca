import type { UserId, WorkspaceId } from '../../domain/shared';
import type { Workspace, WorkspaceType } from '../../domain/workspace';

export interface WorkspaceCreateInput {
  readonly name: string;
  readonly createdBy: UserId;
  readonly description?: string | null;
  readonly coverImageUrl?: string | null;
  readonly coverImageStoragePath?: string | null;
  readonly type?: WorkspaceType;
}

export interface WorkspaceUpdateInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly coverImageUrl?: string | null;
  readonly coverImageStoragePath?: string | null;
  readonly type?: WorkspaceType;
}

export interface WorkspaceRepository {
  create(input: WorkspaceCreateInput): Promise<Workspace>;
  list(): Promise<Workspace[]>;
  findById(id: WorkspaceId): Promise<Workspace | null>;
  update(id: WorkspaceId, updates: WorkspaceUpdateInput): Promise<Workspace>;
  touchActivity(id: WorkspaceId, at?: Date): Promise<Workspace>;
  delete(id: WorkspaceId): Promise<void>;
}
