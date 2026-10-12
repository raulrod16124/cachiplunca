import type { Element } from '../../domain/element';
import type { ElementRealtimeEvent } from '../ports';
import { sortElementsForLoad } from '../queries/load-workspace-elements';
import { resolveElementVersion } from './element-conflict-resolution';

export function applyRemoteElementChanges(
  current: readonly Element[],
  event: ElementRealtimeEvent,
): readonly Element[] {
  const hasRemoteChanges = event.changes.some((change) => change.origin === 'remote');

  if (!hasRemoteChanges) {
    return current;
  }

  const byId = new Map<string, Element>();
  for (const element of current) {
    byId.set(element.id.value, element);
  }

  let changed = false;

  for (const change of event.changes) {
    if (change.origin !== 'remote') {
      continue;
    }

    switch (change.kind) {
      case 'added':
      case 'modified': {
        const incoming = change.element;

        if (incoming.workspaceId.value !== event.workspaceId.value) {
          continue;
        }

        const existing = byId.get(incoming.id.value);

        if (existing === undefined || resolveElementVersion(incoming, existing) === incoming) {
          byId.set(incoming.id.value, incoming);
          changed = true;
        }
        break;
      }
      case 'removed': {
        if (byId.delete(change.elementId.value)) {
          changed = true;
        }
        break;
      }
    }
  }

  if (!changed) {
    return current;
  }

  return sortElementsForLoad([...byId.values()]);
}
