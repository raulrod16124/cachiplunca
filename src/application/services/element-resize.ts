import { withPosition, type Element } from '../../domain/element';
import { Position, Size } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import { createResizeElement } from '../commands';
import { toValidationAppError } from '../commands/to-validation-app-error';
import { normalizeRotation, rotateVector } from './element-rotate';

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
  const rotation = normalizeRotation(element.rotation);
  const horizontal = axisFactor(anchor, 'left', 'right');
  const vertical = axisFactor(anchor, 'top', 'bottom');

  if (rotation === 0) {
    return computeUnrotatedGeometry(element, horizontal, vertical, delta, minSize);
  }

  return computeRotatedGeometry(element, rotation, horizontal, vertical, delta, minSize);
}

function computeUnrotatedGeometry(
  element: Element,
  horizontal: 0 | 1 | -1,
  vertical: 0 | 1 | -1,
  delta: Position,
  minSize: number,
): { readonly position: Position; readonly size: Size } {
  const startLeft = element.position.x;
  const startTop = element.position.y;
  const startWidth = element.size.width;
  const startHeight = element.size.height;
  const right = startLeft + startWidth;
  const bottom = startTop + startHeight;

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

function computeRotatedGeometry(
  element: Element,
  rotation: number,
  horizontal: 0 | 1 | -1,
  vertical: 0 | 1 | -1,
  delta: Position,
  minSize: number,
): { readonly position: Position; readonly size: Size } {
  const startWidth = element.size.width;
  const startHeight = element.size.height;
  const localDelta = rotateVector(delta, -rotation);

  const nextWidth =
    horizontal === 0 ? startWidth : Math.max(minSize, startWidth + horizontal * localDelta.x);
  const nextHeight =
    vertical === 0 ? startHeight : Math.max(minSize, startHeight + vertical * localDelta.y);

  const center = Position.create(
    element.position.x + startWidth / 2,
    element.position.y + startHeight / 2,
  );
  const anchorWorld = center.add(
    rotateVector(
      Position.create((-horizontal * startWidth) / 2, (-vertical * startHeight) / 2),
      rotation,
    ),
  );
  const nextCenter = anchorWorld.add(
    rotateVector(
      Position.create((horizontal * nextWidth) / 2, (vertical * nextHeight) / 2),
      rotation,
    ),
  );

  return {
    position: Position.create(nextCenter.x - nextWidth / 2, nextCenter.y - nextHeight / 2),
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
