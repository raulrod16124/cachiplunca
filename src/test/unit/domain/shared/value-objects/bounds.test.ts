import { Bounds, Position, Size } from '../../../../../domain/shared';

describe('Bounds', () => {
  it('creates bounds from position and size', () => {
    const bounds = Bounds.create(Position.create(10, 20), Size.create(100, 200));

    expect(bounds.x).toBe(10);
    expect(bounds.y).toBe(20);
    expect(bounds.width).toBe(100);
    expect(bounds.height).toBe(200);
  });

  it('creates bounds from xywh values', () => {
    const bounds = Bounds.fromXYWH(5, 6, 50, 60);

    expect(bounds.x).toBe(5);
    expect(bounds.y).toBe(6);
    expect(bounds.width).toBe(50);
    expect(bounds.height).toBe(60);
  });

  it('creates with of() factory method', () => {
    const bounds = Bounds.of(Position.create(1, 2), Size.create(3, 4));

    expect(bounds.left).toBe(1);
    expect(bounds.top).toBe(2);
  });

  it('calculates derived edges and center', () => {
    const bounds = Bounds.fromXYWH(10, 20, 100, 200);

    expect(bounds.left).toBe(10);
    expect(bounds.top).toBe(20);
    expect(bounds.right).toBe(110);
    expect(bounds.bottom).toBe(220);
    expect(bounds.centerX).toBe(60);
    expect(bounds.centerY).toBe(120);
  });

  it('contains a point inside', () => {
    const bounds = Bounds.fromXYWH(0, 0, 100, 100);

    expect(bounds.contains(Position.create(50, 50))).toBe(true);
  });

  it('contains a point on the edge', () => {
    const bounds = Bounds.fromXYWH(0, 0, 100, 100);

    expect(bounds.contains(Position.create(0, 0))).toBe(true);
    expect(bounds.contains(Position.create(100, 100))).toBe(true);
  });

  it('does not contain a point outside', () => {
    const bounds = Bounds.fromXYWH(0, 0, 100, 100);

    expect(bounds.contains(Position.create(101, 50))).toBe(false);
    expect(bounds.contains(Position.create(50, 101))).toBe(false);
  });

  it('detects intersecting bounds', () => {
    const a = Bounds.fromXYWH(0, 0, 100, 100);
    const b = Bounds.fromXYWH(50, 50, 100, 100);

    expect(a.intersects(b)).toBe(true);
  });

  it('detects non-intersecting bounds', () => {
    const a = Bounds.fromXYWH(0, 0, 100, 100);
    const b = Bounds.fromXYWH(200, 200, 100, 100);

    expect(a.intersects(b)).toBe(false);
  });

  it('does not intersect when only edges touch', () => {
    const a = Bounds.fromXYWH(0, 0, 100, 100);
    const b = Bounds.fromXYWH(100, 0, 100, 100);

    expect(a.intersects(b)).toBe(false);
  });

  it('unions two bounds', () => {
    const a = Bounds.fromXYWH(0, 0, 50, 50);
    const b = Bounds.fromXYWH(100, 100, 50, 50);

    const union = a.union(b);

    expect(union).toEqual(Bounds.fromXYWH(0, 0, 150, 150));
  });

  it('unions overlapping bounds', () => {
    const a = Bounds.fromXYWH(0, 0, 100, 100);
    const b = Bounds.fromXYWH(50, 50, 100, 100);

    const union = a.union(b);

    expect(union).toEqual(Bounds.fromXYWH(0, 0, 150, 150));
  });

  it('compares equality correctly', () => {
    const a = Bounds.fromXYWH(1, 2, 3, 4);
    const b = Bounds.fromXYWH(1, 2, 3, 4);
    const c = Bounds.fromXYWH(1, 2, 4, 3);

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('converts to string', () => {
    const bounds = Bounds.fromXYWH(1, 2, 3, 4);

    expect(bounds.toString()).toBe('Bounds(Position(1, 2), Size(3, 4))');
  });

  it('serializes to JSON', () => {
    const bounds = Bounds.fromXYWH(1, 2, 3, 4);

    expect(bounds.toJSON()).toEqual({ x: 1, y: 2, width: 3, height: 4 });
  });
});
