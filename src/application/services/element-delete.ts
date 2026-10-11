import type { Element } from '../../domain/element';
import type { AppError } from '../../shared/errors';
import { createDeleteElement } from '../commands';

export type DeleteElementsResult =
  | { readonly status: 'ok'; readonly elements: readonly Element[] }
  | { readonly status: 'error'; readonly error: AppError };

export function deleteElements(
  elements: readonly Element[],
  ids: readonly string[],
): DeleteElementsResult {
  const targetIds = new Set(ids);

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
