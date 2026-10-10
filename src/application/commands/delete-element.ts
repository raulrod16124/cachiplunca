import { validateElement, type Element } from '../../domain/element';
import type { AppError } from '../../shared/errors';
import { toValidationAppError } from './to-validation-app-error';

export interface DeleteElementInput {
  readonly element: Element;
}

export type DeleteElementResult =
  | { readonly status: 'ok'; readonly element: Element }
  | { readonly status: 'error'; readonly error: AppError };

export type DeleteElement = (input: DeleteElementInput) => DeleteElementResult;

export function createDeleteElement(): DeleteElement {
  return (input: DeleteElementInput): DeleteElementResult => {
    try {
      validateElement(input.element);
      return { status: 'ok', element: input.element };
    } catch (error) {
      return { status: 'error', error: toValidationAppError(error) };
    }
  };
}
