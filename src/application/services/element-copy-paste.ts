import type { Element } from '../../domain/element';
import type { ElementId, Position } from '../../domain/shared';
import { Position as PositionValue } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import { createPasteElement } from '../commands';

export const DEFAULT_PASTE_OFFSET: Position = PositionValue.create(16, 16);

export interface PasteElementsDeps {
  readonly generateId: () => ElementId;
  readonly now?: () => Date;
  readonly offset?: Position;
}

export type CopyElementsResult =
  | { readonly status: 'ok'; readonly copiedElements: readonly Element[] }
  | { readonly status: 'error'; readonly error: AppError };

export type PasteElementsResult =
  | {
      readonly status: 'ok';
      readonly elements: readonly Element[];
      readonly pastedIds: readonly string[];
    }
  | { readonly status: 'error'; readonly error: AppError };

export function copyElements(
  elements: readonly Element[],
  ids: readonly string[],
): CopyElementsResult {
  const targetIds = new Set(ids);

  if (targetIds.size === 0) {
    return { status: 'ok', copiedElements: [] };
  }

  const copiedElements: Element[] = [];

  for (const element of elements) {
    if (targetIds.has(element.id.value)) {
      copiedElements.push(element);
    }
  }

  return { status: 'ok', copiedElements };
}

export function pasteElements(
  elements: readonly Element[],
  copiedElements: readonly Element[],
  deps: PasteElementsDeps,
): PasteElementsResult {
  if (copiedElements.length === 0) {
    return { status: 'ok', elements: [...elements], pastedIds: [] };
  }

  const offset = deps.offset ?? DEFAULT_PASTE_OFFSET;
  const pasteElement = createPasteElement(deps);
  const pasted: Element[] = [];
  const pastedIds: string[] = [];

  for (const element of copiedElements) {
    const result = pasteElement({
      element,
      position: element.position.add(offset),
    });

    if (result.status === 'error') {
      return { status: 'error', error: result.error };
    }

    pasted.push(result.element);
    pastedIds.push(result.element.id.value);
  }

  return { status: 'ok', elements: [...elements, ...pasted], pastedIds };
}
