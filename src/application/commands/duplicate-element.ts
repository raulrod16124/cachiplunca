import { duplicateElement, type Element } from '../../domain/element';
import type { ElementId, Position } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import { toValidationAppError } from './to-validation-app-error';

export interface DuplicateElementInput {
  readonly element: Element;
  readonly position?: Position;
}

export interface DuplicateElementDeps {
  readonly generateId: () => ElementId;
  readonly now?: () => Date;
}

export type DuplicateElementResult =
  | { readonly status: 'ok'; readonly element: Element }
  | { readonly status: 'error'; readonly error: AppError };

export type DuplicateElement = (input: DuplicateElementInput) => DuplicateElementResult;

export function createDuplicateElement(deps: DuplicateElementDeps): DuplicateElement {
  return (input: DuplicateElementInput): DuplicateElementResult => {
    try {
      const createdAt = deps.now === undefined ? new Date() : deps.now();
      return {
        status: 'ok',
        element: duplicateElement(input.element, {
          id: deps.generateId(),
          createdAt,
          position: input.position,
        }),
      };
    } catch (error) {
      return { status: 'error', error: toValidationAppError(error) };
    }
  };
}
