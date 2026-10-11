import type { Element } from '../../domain/element';
import type { Position } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import { createMoveElement } from '../commands/move-element';

export function resolveMoveIds(hitId: string, selectedIds: readonly string[]): readonly string[] {
  return selectedIds.includes(hitId) ? [...selectedIds] : [hitId];
}

export interface MoveElementsDeps {
  readonly now?: () => Date;
}

export type MoveElementsResult =
  | { readonly status: 'ok'; readonly elements: readonly Element[] }
  | { readonly status: 'error'; readonly error: AppError };

export function moveElementsByDelta(
  elements: readonly Element[],
  ids: readonly string[],
  delta: Position,
  deps: MoveElementsDeps = {},
): MoveElementsResult {
  const moveElement = createMoveElement(deps);
  const targetIds = new Set(ids);
  const moved: Element[] = [];

  for (const element of elements) {
    if (!targetIds.has(element.id.value)) {
      moved.push(element);
      continue;
    }

    const result = moveElement({ element, position: element.position.add(delta) });

    if (result.status === 'error') {
      return { status: 'error', error: result.error };
    }

    moved.push(result.element);
  }

  return { status: 'ok', elements: moved };
}
