import type { Element } from '../../domain/element';
import { withRotation } from '../../domain/element';
import { Bounds, Position } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import { toValidationAppError } from '../commands/to-validation-app-error';

export const ROTATION_SNAP_STEP = 15;

export interface RotationGestureInput {
  readonly center: Position;
  readonly pointer: Position;
  readonly startAngle: number;
  readonly startRotation: number;
  readonly snap: boolean;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function angleAt(center: Position, pointer: Position): number {
  return (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) / Math.PI;
}

export function normalizeRotation(rotation: number): number {
  if (!Number.isFinite(rotation)) {
    throw new Error('Element rotation must be a finite number');
  }

  const normalized = rotation % 360;

  return normalized < 0 ? normalized + 360 : normalized;
}

export function snapRotation(rotation: number, step = ROTATION_SNAP_STEP): number {
  if (!Number.isFinite(step) || step <= 0) {
    throw new Error('Rotation snap step must be a positive finite number');
  }

  return normalizeRotation(Math.round(rotation / step) * step);
}

export function computeRotation(input: RotationGestureInput): number {
  const currentAngle = angleAt(input.center, input.pointer);
  const rotation = input.startRotation + (currentAngle - input.startAngle);

  return input.snap ? snapRotation(rotation) : normalizeRotation(rotation);
}

export function rotateVector(vector: Position, degrees: number): Position {
  const radians = toRadians(degrees);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return Position.create(vector.x * cos - vector.y * sin, vector.x * sin + vector.y * cos);
}

export function rotatePointAround(point: Position, center: Position, degrees: number): Position {
  return center.add(rotateVector(point.subtract(center), degrees));
}

export function rotatedBounds(bounds: Bounds, degrees: number): Bounds {
  const rotation = normalizeRotation(degrees);

  if (rotation === 0) {
    return bounds;
  }

  const center = Position.create(bounds.centerX, bounds.centerY);
  const corners = [
    rotatePointAround(bounds.position, center, rotation),
    rotatePointAround(Position.create(bounds.right, bounds.top), center, rotation),
    rotatePointAround(Position.create(bounds.left, bounds.bottom), center, rotation),
    rotatePointAround(Position.create(bounds.right, bounds.bottom), center, rotation),
  ];
  const left = Math.min(...corners.map((corner) => corner.x));
  const top = Math.min(...corners.map((corner) => corner.y));
  const right = Math.max(...corners.map((corner) => corner.x));
  const bottom = Math.max(...corners.map((corner) => corner.y));

  return Bounds.fromXYWH(left, top, right - left, bottom - top);
}

export interface RotateElementDeps {
  readonly now?: () => Date;
}

export type RotateElementResult =
  | { readonly status: 'ok'; readonly element: Element }
  | { readonly status: 'error'; readonly error: AppError };

export function rotateElementTo(
  element: Element,
  rotation: number,
  deps: RotateElementDeps = {},
): RotateElementResult {
  try {
    const updatedAt = deps.now === undefined ? new Date() : deps.now();
    const next = withRotation(element, normalizeRotation(rotation), updatedAt);

    return { status: 'ok', element: next };
  } catch (error) {
    return { status: 'error', error: toValidationAppError(error) };
  }
}
