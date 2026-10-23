import type { Element } from '../../domain/element';
import type { ElementId, WorkspaceId } from '../../domain/shared';
import type { WorkspaceRepository } from '../ports';
import type { ElementPersistence, PersistElementMutationResult } from './element-persistence';

export interface ElementPersistenceOrchestrator {
  persistDelta(
    previous: readonly Element[],
    next: readonly Element[],
    workspaceId?: WorkspaceId,
  ): Promise<PersistElementMutationResult>;
}

export interface ElementPersistenceOrchestratorOptions {
  readonly workspaceRepository?: Pick<WorkspaceRepository, 'touchActivity'>;
  readonly now?: () => Date;
}

export function createElementPersistenceOrchestrator(
  persistence: ElementPersistence,
  options: ElementPersistenceOrchestratorOptions = {},
): ElementPersistenceOrchestrator {
  return {
    async persistDelta(
      previous: readonly Element[],
      next: readonly Element[],
      workspaceId?: WorkspaceId,
    ): Promise<PersistElementMutationResult> {
      const { upserts, removedIds } = computeElementDelta(previous, next);

      if (upserts.length === 0 && removedIds.length === 0) {
        return { status: 'ok' };
      }

      const removed = await persistence.removeMany(removedIds);

      if (removed.status === 'error') {
        return removed;
      }

      const result = await persistence.saveMany(upserts);

      if (result.status === 'ok') {
        await touchActivityBestEffort(options, workspaceId);
      }

      return result;
    },
  };
}

async function touchActivityBestEffort(
  options: ElementPersistenceOrchestratorOptions,
  workspaceId: WorkspaceId | undefined,
): Promise<void> {
  if (options.workspaceRepository === undefined || workspaceId === undefined) {
    return;
  }

  try {
    await options.workspaceRepository.touchActivity(
      workspaceId,
      options.now === undefined ? undefined : options.now(),
    );
  } catch {
    return;
  }
}

interface ElementDelta {
  readonly upserts: readonly Element[];
  readonly removedIds: readonly ElementId[];
}

export function computeElementDelta(
  previous: readonly Element[],
  next: readonly Element[],
): ElementDelta {
  const previousById = new Map<string, Element>();
  for (const element of previous) {
    previousById.set(element.id.value, element);
  }

  const nextIds = new Set<string>();
  const upserts: Element[] = [];

  for (const element of next) {
    nextIds.add(element.id.value);

    const before = previousById.get(element.id.value);
    if (before === undefined || before !== element) {
      upserts.push(element);
    }
  }

  const removedIds: ElementId[] = [];
  for (const element of previous) {
    if (!nextIds.has(element.id.value)) {
      removedIds.push(element.id);
    }
  }

  return { upserts, removedIds };
}
