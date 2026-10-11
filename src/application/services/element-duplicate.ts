import type { Element } from '../../domain/element';
import type { ElementId, Position } from '../../domain/shared';
import { Position as PositionValue } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import { createDuplicateElement } from '../commands';

export const DEFAULT_DUPLICATE_OFFSET: Position = PositionValue.create(16, 16);

export interface DuplicateElementsDeps {
  readonly generateId: () => ElementId;
  readonly now?: () => Date;
  readonly offset?: Position;
}

export type DuplicateElementsResult =
  | {
      readonly status: 'ok';
      readonly elements: readonly Element[];
      readonly duplicatedIds: readonly string[];
    }
  | { readonly status: 'error'; readonly error: AppError };

export function duplicateElements(
  elements: readonly Element[],
  ids: readonly string[],
  deps: DuplicateElementsDeps,
): DuplicateElementsResult {
  const targetIds = new Set(ids);

  if (targetIds.size === 0) {
    return { status: 'ok', elements: [...elements], duplicatedIds: [] };
  }

  const offset = deps.offset ?? DEFAULT_DUPLICATE_OFFSET;
  const duplicateElement = createDuplicateElement(deps);
  const copies: Element[] = [];
  const duplicatedIds: string[] = [];

  for (const element of elements) {
    if (!targetIds.has(element.id.value)) {
      continue;
    }

    const result = duplicateElement({
      element,
      position: element.position.add(offset),
    });

    if (result.status === 'error') {
      return { status: 'error', error: result.error };
    }

    copies.push(result.element);
    duplicatedIds.push(result.element.id.value);
  }

  return { status: 'ok', elements: [...elements, ...copies], duplicatedIds };
}
