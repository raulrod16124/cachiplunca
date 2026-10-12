import type { Element } from '../../domain/element';
import { sortElementsForLoad } from '../queries/load-workspace-elements';
import { isStrictlyNewer } from './element-conflict-resolution';
import { computeElementDelta } from './element-persistence-orchestrator';

export function rollbackFailedMutation(
  current: readonly Element[],
  previous: readonly Element[],
  next: readonly Element[],
): readonly Element[] {
  const { upserts, removedIds } = computeElementDelta(previous, next);

  const byId = new Map<string, Element>();
  for (const element of current) {
    byId.set(element.id.value, element);
  }

  let changed = false;

  for (const optimistic of upserts) {
    const previousVersion = findById(previous, optimistic.id.value);
    const currentVersion = byId.get(optimistic.id.value);
    const superseded = currentVersion !== undefined && isStrictlyNewer(currentVersion, optimistic);

    if (previousVersion === undefined) {
      if (currentVersion !== undefined && !superseded) {
        byId.delete(optimistic.id.value);
        changed = true;
      }
      continue;
    }

    if (currentVersion === undefined || superseded) {
      continue;
    }

    byId.set(optimistic.id.value, previousVersion);
    changed = true;
  }

  for (const removed of removedIds) {
    if (byId.has(removed.value)) {
      continue;
    }

    const previousVersion = findById(previous, removed.value);
    if (previousVersion !== undefined) {
      byId.set(previousVersion.id.value, previousVersion);
      changed = true;
    }
  }

  if (!changed) {
    return current;
  }

  return sortElementsForLoad([...byId.values()]);
}

function findById(elements: readonly Element[], id: string): Element | undefined {
  for (const element of elements) {
    if (element.id.value === id) {
      return element;
    }
  }
  return undefined;
}
