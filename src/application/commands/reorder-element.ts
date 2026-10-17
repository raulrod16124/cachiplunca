import { withZIndex, type Element } from '../../domain/element';
import type { AppError } from '../../shared/errors';
import { toValidationAppError } from './to-validation-app-error';

export interface ReorderElementInput {
  readonly element: Element;
  readonly zIndex: number;
}

export interface ReorderElementDeps {
  readonly now?: () => Date;
}

export type ReorderElementResult =
  | { readonly status: 'ok'; readonly element: Element }
  | { readonly status: 'error'; readonly error: AppError };

export type ReorderElement = (input: ReorderElementInput) => ReorderElementResult;

export function createReorderElement(deps: ReorderElementDeps = {}): ReorderElement {
  return (input: ReorderElementInput): ReorderElementResult => {
    try {
      const updatedAt = deps.now === undefined ? new Date() : deps.now();
      return { status: 'ok', element: withZIndex(input.element, input.zIndex, updatedAt) };
    } catch (error) {
      return { status: 'error', error: toValidationAppError(error) };
    }
  };
}
