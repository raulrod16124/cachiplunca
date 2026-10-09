import { Size } from '../../../../../domain/shared';

describe('Size', () => {
  it('creates a size with non-negative dimensions', () => {
    const size = Size.create(100, 200);

    expect(size.width).toBe(100);
    expect(size.height).toBe(200);
  });

  it('creates with of() factory method', () => {
    const size = Size.of(50, 75);

    expect(size.width).toBe(50);
    expect(size.height).toBe(75);
  });

  it('allows zero dimensions', () => {
    const size = Size.create(0, 0);

    expect(size.width).toBe(0);
    expect(size.height).toBe(0);
  });

  it('throws when width is negative', () => {
    expect(() => Size.create(-1, 10)).toThrow('Size width cannot be negative');
  });

  it('throws when height is negative', () => {
    expect(() => Size.create(10, -1)).toThrow('Size height cannot be negative');
  });

  it('throws when width is NaN', () => {
    expect(() => Size.create(NaN, 10)).toThrow('Size width must be a finite number');
  });

  it('throws when height is Infinity', () => {
    expect(() => Size.create(10, Infinity)).toThrow('Size height must be a finite number');
  });

  it('calculates area', () => {
    expect(Size.create(4, 5).area()).toBe(20);
  });

  it('reports empty when any dimension is zero', () => {
    expect(Size.create(0, 10).isEmpty()).toBe(true);
    expect(Size.create(10, 0).isEmpty()).toBe(true);
    expect(Size.create(10, 10).isEmpty()).toBe(false);
  });

  it('compares equality correctly', () => {
    const a = Size.create(100, 200);
    const b = Size.create(100, 200);
    const c = Size.create(200, 100);

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('converts to string', () => {
    const size = Size.create(3, 4);

    expect(size.toString()).toBe('Size(3, 4)');
  });

  it('serializes to JSON', () => {
    const size = Size.create(6, 7);

    expect(size.toJSON()).toEqual({ width: 6, height: 7 });
  });
});
