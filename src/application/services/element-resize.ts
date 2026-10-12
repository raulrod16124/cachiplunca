import { withPosition, type Element } from '../../domain/element';
import { Position, Size } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import { createResizeElement } from '../commands';
import { toValidationAppError } from '../commands/to-validation-app-error';

export const MIN_ELEMENT_SIZE = 1;

export type ResizeHandleAnchor =
  'top-left' | 'top' | 'top-right' | 'right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'left';

export interface ResizeElementByHandleDeps {
  readonly now?: () => Date;
  readonly minSize?: number;
}

export type ResizeElementByHandleResult =
  | { readonly status: 'ok'; readonly element: Element }
  | { readonly status: 'error'; readonly error: AppError };

function axisFactor(anchor: ResizeHandleAnchor, negative: string, positive: string): 0 | 1 | -1 {
  if (anchor.includes(positive)) {
    return 1;
  }

  if (anchor.includes(negative)) {
    return -1;
  }

  return 0;
}

function computeGeometry(
  element: Element,
  anchor: ResizeHandleAnchor,
  delta: Position,
  minSize: number,
): { readonly position: Position; readonly size: Size } {
  const startLeft = element.position.x;
  const startTop = element.position.y;
  const startWidth = element.size.width;
  const startHeight = element.size.height;
  const right = startLeft + startWidth;
  const bottom = startTop + startHeight;

  const horizontal = axisFactor(anchor, 'left', 'right');
  const vertical = axisFactor(anchor, 'top', 'bottom');

  const nextWidth =
    horizontal === 0 ? startWidth : Math.max(minSize, startWidth + horizontal * delta.x);
  const nextHeight =
    vertical === 0 ? startHeight : Math.max(minSize, startHeight + vertical * delta.y);

  const nextLeft = horizontal === -1 ? right - nextWidth : startLeft;
  const nextTop = vertical === -1 ? bottom - nextHeight : startTop;

  return {
    position: Position.create(nextLeft, nextTop),
    size: Size.create(nextWidth, nextHeight),
  };
}

export function resizeElementByHandle(
  element: Element,
  anchor: ResizeHandleAnchor,
  delta: Position,
  deps: ResizeElementByHandleDeps = {},
): ResizeElementByHandleResult {
  try {
    const updatedAt = deps.now === undefined ? new Date() : deps.now();
    const minSize = deps.minSize ?? MIN_ELEMENT_SIZE;
    const { position, size } = computeGeometry(element, anchor, delta, minSize);

    let next = element;

    if (!position.equals(element.position)) {
      next = withPosition(next, position, updatedAt);
    }

    const resizeElement = createResizeElement({ now: () => updatedAt });
    const result = resizeElement({ element: next, size });

    if (result.status === 'error') {
      return result;
    }

    return { status: 'ok', element: result.element };
  } catch (error) {
    return { status: 'error', error: toValidationAppError(error) };
  }
}
