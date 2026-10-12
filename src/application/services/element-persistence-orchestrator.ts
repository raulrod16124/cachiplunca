import type { Element } from '../../domain/element';
import type { ElementId } from '../../domain/shared';
import type { ElementPersistence, PersistElementMutationResult } from './element-persistence';

export interface ElementPersistenceOrchestrator {
  persistDelta(
    previous: readonly Element[],
    next: readonly Element[],
  ): Promise<PersistElementMutationResult>;
}

export function createElementPersistenceOrchestrator(
  persistence: ElementPersistence,
): ElementPersistenceOrchestrator {
  return {
    async persistDelta(
      previous: readonly Element[],
      next: readonly Element[],
    ): Promise<PersistElementMutationResult> {
      const { upserts, removedIds } = computeElementDelta(previous, next);

      if (upserts.length === 0 && removedIds.length === 0) {
        return { status: 'ok' };
      }

      const removed = await persistence.removeMany(removedIds);

      if (removed.status === 'error') {
        return removed;
      }

      return persistence.saveMany(upserts);
    },
  };
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
