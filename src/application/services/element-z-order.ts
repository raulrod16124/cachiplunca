import type { Element } from '../../domain/element';
import type { AppError } from '../../shared/errors';
import { createReorderElement } from '../commands';
import { sortElementsForLoad } from '../queries';

export interface ReorderElementsDeps {
  readonly now?: () => Date;
}

export type ReorderElementsResult =
  | { readonly status: 'ok'; readonly elements: readonly Element[] }
  | { readonly status: 'error'; readonly error: AppError };

export function bringElementsToFront(
  elements: readonly Element[],
  ids: readonly string[],
  deps: ReorderElementsDeps = {},
): ReorderElementsResult {
  const targetIds = new Set(ids);
  const targets = elements.filter((element) => targetIds.has(element.id.value));

  if (targets.length === 0) {
    return { status: 'ok', elements: [...elements] };
  }

  const others = elements.filter((element) => !targetIds.has(element.id.value));
  const base =
    others.length === 0
      ? Math.max(...targets.map((element) => element.zIndex))
      : Math.max(...others.map((element) => element.zIndex));

  const zIndexes = new Map<string, number>(
    targets.map((element, index) => [element.id.value, base + 1 + index]),
  );

  return applyZIndexes(elements, zIndexes, deps);
}

export function sendElementsToBack(
  elements: readonly Element[],
  ids: readonly string[],
  deps: ReorderElementsDeps = {},
): ReorderElementsResult {
  const targetIds = new Set(ids);
  const targets = elements.filter((element) => targetIds.has(element.id.value));

  if (targets.length === 0) {
    return { status: 'ok', elements: [...elements] };
  }

  const others = elements.filter((element) => !targetIds.has(element.id.value));
  const base =
    others.length === 0
      ? Math.min(...targets.map((element) => element.zIndex))
      : Math.min(...others.map((element) => element.zIndex));

  const zIndexes = new Map<string, number>(
    targets.map((element, index) => [element.id.value, base - targets.length + index]),
  );

  return applyZIndexes(elements, zIndexes, deps);
}

function applyZIndexes(
  elements: readonly Element[],
  zIndexes: ReadonlyMap<string, number>,
  deps: ReorderElementsDeps,
): ReorderElementsResult {
  const reorderElement = createReorderElement(deps);
  const nextById = new Map<string, Element>();

  for (const element of elements) {
    const zIndex = zIndexes.get(element.id.value);

    if (zIndex === undefined) {
      nextById.set(element.id.value, element);
      continue;
    }

    const result = reorderElement({ element, zIndex });

    if (result.status === 'error') {
      return { status: 'error', error: result.error };
    }

    nextById.set(element.id.value, result.element);
  }

  const next = elements.map((element) => nextById.get(element.id.value) ?? element);

  return { status: 'ok', elements: sortElementsForLoad(next) };
}
