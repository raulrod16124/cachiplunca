import { withSize, type Element } from '../../domain/element';
import type { Size } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import { toValidationAppError } from './to-validation-app-error';

export interface ResizeElementInput {
  readonly element: Element;
  readonly size: Size;
}

export interface ResizeElementDeps {
  readonly now?: () => Date;
}

export type ResizeElementResult =
  | { readonly status: 'ok'; readonly element: Element }
  | { readonly status: 'error'; readonly error: AppError };

export type ResizeElement = (input: ResizeElementInput) => ResizeElementResult;

export function createResizeElement(deps: ResizeElementDeps = {}): ResizeElement {
  return (input: ResizeElementInput): ResizeElementResult => {
    try {
      const updatedAt = deps.now === undefined ? new Date() : deps.now();
      return { status: 'ok', element: withSize(input.element, input.size, updatedAt) };
    } catch (error) {
      return { status: 'error', error: toValidationAppError(error) };
    }
  };
}
