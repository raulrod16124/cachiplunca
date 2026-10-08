import type { WorkspaceId } from '../../domain/shared';
import type { Workspace } from '../../domain/workspace';

export interface WorkspaceCreateInput {
  readonly name: string;
  readonly description?: string | null;
}

export interface WorkspaceUpdateInput {
  readonly name?: string;
  readonly description?: string | null;
}

export interface WorkspaceRepository {
  create(input: WorkspaceCreateInput): Promise<Workspace>;
  list(): Promise<Workspace[]>;
  findById(id: WorkspaceId): Promise<Workspace | null>;
  update(id: WorkspaceId, updates: WorkspaceUpdateInput): Promise<Workspace>;
  delete(id: WorkspaceId): Promise<void>;
}
