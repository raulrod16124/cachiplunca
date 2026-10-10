import { withPosition, type Element } from '../../domain/element';
import type { Position } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import { toValidationAppError } from './to-validation-app-error';

export interface MoveElementInput {
  readonly element: Element;
  readonly position: Position;
}

export interface MoveElementDeps {
  readonly now?: () => Date;
}

export type MoveElementResult =
  | { readonly status: 'ok'; readonly element: Element }
  | { readonly status: 'error'; readonly error: AppError };

export type MoveElement = (input: MoveElementInput) => MoveElementResult;

export function createMoveElement(deps: MoveElementDeps = {}): MoveElement {
  return (input: MoveElementInput): MoveElementResult => {
    try {
      const updatedAt = deps.now === undefined ? new Date() : deps.now();
      return { status: 'ok', element: withPosition(input.element, input.position, updatedAt) };
    } catch (error) {
      return { status: 'error', error: toValidationAppError(error) };
    }
  };
}
