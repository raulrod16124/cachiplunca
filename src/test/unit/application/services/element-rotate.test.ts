import { Bounds, ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { createTextElement } from '../../../../domain/element';
import {
  angleAt,
  computeRotation,
  normalizeRotation,
  rotateElementTo,
  rotatePointAround,
  rotateVector,
  rotatedBounds,
  snapRotation,
} from '../../../../application/services/element-rotate';

function element() {
  return createTextElement({
    id: ElementId.create('elem-1'),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(10, 20),
    size: Size.create(100, 40),
    rotation: 30,
    content: 'hello',
  });
}

describe('element rotate helpers', () => {
  it('computes the angle from the center to the pointer', () => {
    const center = Position.create(0, 0);

    expect(angleAt(center, Position.create(10, 0))).toBe(0);
    expect(angleAt(center, Position.create(0, 10))).toBe(90);
    expect(angleAt(center, Position.create(-10, 0))).toBe(180);
  });

  it('normalizes rotation into [0, 360)', () => {
    expect(normalizeRotation(0)).toBe(0);
    expect(normalizeRotation(360)).toBe(0);
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(725)).toBe(5);
  });

  it('snaps rotation to the nearest step', () => {
    expect(snapRotation(7)).toBe(0);
    expect(snapRotation(8)).toBe(15);
    expect(snapRotation(352)).toBe(345);
    expect(snapRotation(355)).toBe(0);
  });

  it('computes the delta rotation from the initial angle', () => {
    const center = Position.create(0, 0);

    expect(
      computeRotation({
        center,
        pointer: Position.create(0, 10),
        startAngle: 0,
        startRotation: 0,
        snap: false,
      }),
    ).toBe(90);

    expect(
      computeRotation({
        center,
        pointer: Position.create(0, 10),
        startAngle: 0,
        startRotation: 350,
        snap: false,
      }),
    ).toBe(80);
  });

  it('applies the snap step when requested', () => {
    expect(
      computeRotation({
        center: Position.create(0, 0),
        pointer: Position.create(10, 2),
        startAngle: 0,
        startRotation: 0,
        snap: true,
      }),
    ).toBe(15);
  });

  it('rotates vectors and points around a center', () => {
    const rotatedVector = rotateVector(Position.create(10, 0), 90);

    expect(rotatedVector.x).toBeCloseTo(0);
    expect(rotatedVector.y).toBeCloseTo(10);

    const rotatedPoint = rotatePointAround(Position.create(20, 10), Position.create(10, 10), 180);

    expect(rotatedPoint.x).toBeCloseTo(0);
    expect(rotatedPoint.y).toBeCloseTo(10);
  });

  it('returns the same bounds for a zero rotation', () => {
    const bounds = Bounds.fromXYWH(10, 20, 100, 40);

    expect(rotatedBounds(bounds, 0)).toBe(bounds);
  });

  it('computes the axis aligned bounds of a rotated box', () => {
    const bounds = rotatedBounds(Bounds.fromXYWH(-50, -50, 100, 100), 45);

    expect(bounds.width).toBeCloseTo(Math.SQRT2 * 100);
    expect(bounds.height).toBeCloseTo(Math.SQRT2 * 100);
    expect(bounds.x).toBeCloseTo(-Math.SQRT2 * 50);
    expect(bounds.y).toBeCloseTo(-Math.SQRT2 * 50);
  });

  it('rotates an element and normalizes the stored angle', () => {
    const original = element();
    const result = rotateElementTo(original, 390, {
      now: () => new Date('2030-03-01T00:00:00.000Z'),
    });

    expect(result.status).toBe('ok');

    if (result.status !== 'ok') {
      throw new Error('Expected a successful rotation');
    }

    expect(result.element.rotation).toBe(30);
    expect(result.element.updatedAt.toISOString()).toBe('2030-03-01T00:00:00.000Z');
  });

  it('returns a validation error for non-finite rotations', () => {
    const result = rotateElementTo(element(), Number.NaN);

    expect(result.status).toBe('error');
  });
});
