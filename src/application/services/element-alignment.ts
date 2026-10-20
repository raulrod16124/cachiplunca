import { isConnectorElement, type Element } from '../../domain/element';
import { Bounds, Position } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import { createMoveElement } from '../commands';
import { toValidationAppError } from '../commands/to-validation-app-error';

export const ALIGNMENT_MODES = [
  'left',
  'center-horizontal',
  'right',
  'top',
  'center-vertical',
  'bottom',
] as const;

export type AlignmentMode = (typeof ALIGNMENT_MODES)[number];

export const DISTRIBUTION_AXES = ['horizontal', 'vertical'] as const;

export type DistributionAxis = (typeof DISTRIBUTION_AXES)[number];

export interface ArrangeElementsDeps {
  readonly now?: () => Date;
}

export type ArrangeElementsResult =
  | { readonly status: 'ok'; readonly elements: readonly Element[] }
  | { readonly status: 'error'; readonly error: AppError };

const MIN_ALIGN_COUNT = 2;
const MIN_DISTRIBUTE_COUNT = 3;

function arrangeableElements(elements: readonly Element[], ids: readonly string[]): Element[] {
  const targetIds = new Set(ids);

  return elements.filter(
    (element) => targetIds.has(element.id.value) && !isConnectorElement(element),
  );
}

function referenceBounds(targets: readonly Element[]): Bounds {
  return targets
    .map((element) => Bounds.of(element.position, element.size))
    .reduce((accumulator, bounds) => accumulator.union(bounds));
}

function alignedPosition(element: Element, mode: AlignmentMode, bounds: Bounds): Position {
  switch (mode) {
    case 'left':
      return Position.create(bounds.left, element.position.y);
    case 'center-horizontal':
      return Position.create(bounds.centerX - element.size.width / 2, element.position.y);
    case 'right':
      return Position.create(bounds.right - element.size.width, element.position.y);
    case 'top':
      return Position.create(element.position.x, bounds.top);
    case 'center-vertical':
      return Position.create(element.position.x, bounds.centerY - element.size.height / 2);
    case 'bottom':
      return Position.create(element.position.x, bounds.bottom - element.size.height);
  }
}

function applyPositions(
  elements: readonly Element[],
  targetPositions: ReadonlyMap<string, Position>,
  deps: ArrangeElementsDeps,
): ArrangeElementsResult {
  const moveElement = createMoveElement(deps);
  let changed = false;
  const moved: Element[] = [];

  for (const element of elements) {
    const target = targetPositions.get(element.id.value);

    if (target === undefined || target.equals(element.position)) {
      moved.push(element);
      continue;
    }

    const result = moveElement({ element, position: target });

    if (result.status === 'error') {
      return { status: 'error', error: result.error };
    }

    moved.push(result.element);
    changed = true;
  }

  return { status: 'ok', elements: changed ? moved : elements };
}

export function alignElements(
  elements: readonly Element[],
  ids: readonly string[],
  mode: AlignmentMode,
  deps: ArrangeElementsDeps = {},
): ArrangeElementsResult {
  const targets = arrangeableElements(elements, ids);

  if (targets.length < MIN_ALIGN_COUNT) {
    return { status: 'ok', elements };
  }

  try {
    const bounds = referenceBounds(targets);
    const targetPositions = new Map<string, Position>(
      targets.map((element) => [element.id.value, alignedPosition(element, mode, bounds)]),
    );

    return applyPositions(elements, targetPositions, deps);
  } catch (error) {
    return { status: 'error', error: toValidationAppError(error) };
  }
}

function sizeOnAxis(element: Element, axis: DistributionAxis): number {
  return axis === 'horizontal' ? element.size.width : element.size.height;
}

function offsetOnAxis(element: Element, axis: DistributionAxis): number {
  return axis === 'horizontal' ? element.position.x : element.position.y;
}

function positionOnAxis(element: Element, axis: DistributionAxis, offset: number): Position {
  return axis === 'horizontal'
    ? Position.create(offset, element.position.y)
    : Position.create(element.position.x, offset);
}

export function distributeElements(
  elements: readonly Element[],
  ids: readonly string[],
  axis: DistributionAxis,
  deps: ArrangeElementsDeps = {},
): ArrangeElementsResult {
  const targets = arrangeableElements(elements, ids);

  if (targets.length < MIN_DISTRIBUTE_COUNT) {
    return { status: 'ok', elements };
  }

  try {
    const sorted = [...targets].sort((first, second) => {
      const difference = offsetOnAxis(first, axis) - offsetOnAxis(second, axis);

      return difference === 0 ? first.id.value.localeCompare(second.id.value) : difference;
    });

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    if (first === undefined || last === undefined) {
      return { status: 'ok', elements };
    }

    const start = offsetOnAxis(first, axis);
    const end = offsetOnAxis(last, axis) + sizeOnAxis(last, axis);
    const totalSize = sorted.reduce((total, element) => total + sizeOnAxis(element, axis), 0);
    const gap = (end - start - totalSize) / (sorted.length - 1);
    const targetPositions = new Map<string, Position>();
    let cursor = start + sizeOnAxis(first, axis);

    for (let index = 1; index < sorted.length - 1; index += 1) {
      const element = sorted[index];

      if (element === undefined) {
        continue;
      }

      cursor += gap;
      targetPositions.set(element.id.value, positionOnAxis(element, axis, cursor));
      cursor += sizeOnAxis(element, axis);
    }

    return applyPositions(elements, targetPositions, deps);
  } catch (error) {
    return { status: 'error', error: toValidationAppError(error) };
  }
}
