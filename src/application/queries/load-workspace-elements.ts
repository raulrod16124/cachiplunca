import type { Element } from '../../domain/element';
import { WorkspaceId } from '../../domain/shared';
import { toAppError, type AppError } from '../../shared/errors';
import type { ElementRepository } from '../ports';

export type LoadWorkspaceElementsResult =
  | { readonly status: 'ok'; readonly elements: Element[] }
  | { readonly status: 'error'; readonly error: AppError };

export type LoadWorkspaceElements = (workspaceId: string) => Promise<LoadWorkspaceElementsResult>;

export function sortElementsForLoad(elements: readonly Element[]): Element[] {
  return [...elements].sort(compareElementsForLoad);
}

function compareElementsForLoad(a: Element, b: Element): number {
  const zIndexDiff = a.zIndex - b.zIndex;
  if (zIndexDiff !== 0) {
    return zIndexDiff;
  }

  const createdDiff = a.createdAt.getTime() - b.createdAt.getTime();
  if (createdDiff !== 0) {
    return createdDiff;
  }

  if (a.id.value === b.id.value) {
    return 0;
  }
  return a.id.value < b.id.value ? -1 : 1;
}

export function createLoadWorkspaceElements(
  elementRepository: ElementRepository,
): LoadWorkspaceElements {
  return async (workspaceId: string): Promise<LoadWorkspaceElementsResult> => {
    try {
      const elements = await elementRepository.listByWorkspace(WorkspaceId.create(workspaceId));
      return { status: 'ok', elements: sortElementsForLoad(elements) };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
