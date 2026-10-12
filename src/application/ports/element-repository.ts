import type { Element } from '../../domain/element';
import type { ElementId, WorkspaceId } from '../../domain/shared';

export interface ElementRepository {
  listByWorkspace(workspaceId: WorkspaceId): Promise<Element[]>;
  findById(id: ElementId): Promise<Element | null>;
  save(element: Element): Promise<Element>;
  saveMany(elements: readonly Element[]): Promise<Element[]>;
  delete(id: ElementId): Promise<void>;
  deleteMany(ids: readonly ElementId[]): Promise<void>;
}
