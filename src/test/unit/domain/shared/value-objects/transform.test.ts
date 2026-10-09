import { Position, Transform } from '../../../../../domain/shared';

describe('Transform', () => {
  it('creates a transform with translation and scale', () => {
    const transform = Transform.create(Position.create(10, 20), 2);

    expect(transform.x).toBe(10);
    expect(transform.y).toBe(20);
    expect(transform.scale).toBe(2);
  });

  it('creates with of() factory method', () => {
    const transform = Transform.of(Position.create(5, -3), 0.5);

    expect(transform.translation).toEqual(Position.create(5, -3));
    expect(transform.scale).toBe(0.5);
  });

  it('creates an identity transform', () => {
    const transform = Transform.identity();

    expect(transform.x).toBe(0);
    expect(transform.y).toBe(0);
    expect(transform.scale).toBe(1);
  });

  it('throws when scale is zero', () => {
    expect(() => Transform.create(Position.create(0, 0), 0)).toThrow(
      'Transform scale must be greater than zero',
    );
  });

  it('throws when scale is negative', () => {
    expect(() => Transform.create(Position.create(0, 0), -1)).toThrow(
      'Transform scale must be greater than zero',
    );
  });

  it('throws when scale is NaN', () => {
    expect(() => Transform.create(Position.create(0, 0), NaN)).toThrow(
      'Transform scale must be a finite number',
    );
  });

  it('throws when scale is Infinity', () => {
    expect(() => Transform.create(Position.create(0, 0), Infinity)).toThrow(
      'Transform scale must be a finite number',
    );
  });

  it('returns a new transform with replaced translation', () => {
    const original = Transform.create(Position.create(1, 2), 1);
    const updated = original.withTranslation(Position.create(3, 4));

    expect(updated.translation).toEqual(Position.create(3, 4));
    expect(updated.scale).toBe(1);
    expect(original.translation).toEqual(Position.create(1, 2));
  });

  it('returns a new transform with replaced scale', () => {
    const original = Transform.create(Position.create(1, 2), 1);
    const updated = original.withScale(2);

    expect(updated.scale).toBe(2);
    expect(updated.translation).toEqual(Position.create(1, 2));
    expect(original.scale).toBe(1);
  });

  it('translates by a delta', () => {
    const transform = Transform.create(Position.create(10, 20), 1);
    const moved = transform.translate(Position.create(5, -5));

    expect(moved.translation).toEqual(Position.create(15, 15));
    expect(moved.scale).toBe(1);
  });

  it('compares equality correctly', () => {
    const a = Transform.create(Position.create(1, 2), 1.5);
    const b = Transform.create(Position.create(1, 2), 1.5);
    const c = Transform.create(Position.create(1, 2), 2);
    const d = Transform.create(Position.create(2, 1), 1.5);

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
    expect(a.equals(d)).toBe(false);
  });

  it('converts to string', () => {
    const transform = Transform.create(Position.create(1, 2), 1.5);

    expect(transform.toString()).toBe('Transform(Position(1, 2), scale=1.5)');
  });

  it('serializes to JSON', () => {
    const transform = Transform.create(Position.create(7, 8), 2);

    expect(transform.toJSON()).toEqual({ x: 7, y: 8, scale: 2 });
  });
});
