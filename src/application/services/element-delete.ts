import { isConnectorElement, type Element } from '../../domain/element';
import type { AppError } from '../../shared/errors';
import { createDeleteElement } from '../commands';

export type DeleteElementsResult =
  | { readonly status: 'ok'; readonly elements: readonly Element[] }
  | { readonly status: 'error'; readonly error: AppError };

export function deleteElements(
  elements: readonly Element[],
  ids: readonly string[],
): DeleteElementsResult {
  const targetIds = expandWithAttachedConnectors(elements, ids);

  if (targetIds.size === 0) {
    return { status: 'ok', elements: [...elements] };
  }

  const deleteElement = createDeleteElement();
  const remaining: Element[] = [];

  for (const element of elements) {
    if (!targetIds.has(element.id.value)) {
      remaining.push(element);
      continue;
    }

    const result = deleteElement({ element });

    if (result.status === 'error') {
      return { status: 'error', error: result.error };
    }
  }

  return { status: 'ok', elements: remaining };
}

export function expandWithAttachedConnectors(
  elements: readonly Element[],
  ids: readonly string[],
): ReadonlySet<string> {
  const targetIds = new Set(ids);
  let changed = true;

  while (changed) {
    changed = false;

    for (const element of elements) {
      if (!isConnectorElement(element) || targetIds.has(element.id.value)) {
        continue;
      }

      const isAttached =
        (element.sourceElementId !== undefined && targetIds.has(element.sourceElementId.value)) ||
        (element.targetElementId !== undefined && targetIds.has(element.targetElementId.value));

      if (isAttached) {
        targetIds.add(element.id.value);
        changed = true;
      }
    }
  }

  return targetIds;
}
