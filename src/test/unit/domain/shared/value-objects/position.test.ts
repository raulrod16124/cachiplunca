import { Position } from '../../../../../domain/shared';

describe('Position', () => {
  it('creates a position with finite coordinates', () => {
    const position = Position.create(10, 20);

    expect(position.x).toBe(10);
    expect(position.y).toBe(20);
  });

  it('creates with of() factory method', () => {
    const position = Position.of(5, -3);

    expect(position.x).toBe(5);
    expect(position.y).toBe(-3);
  });

  it('supports negative coordinates', () => {
    const position = Position.create(-100, -200);

    expect(position.x).toBe(-100);
    expect(position.y).toBe(-200);
  });

  it('throws when x is NaN', () => {
    expect(() => Position.create(NaN, 0)).toThrow('Position x must be a finite number');
  });

  it('throws when y is NaN', () => {
    expect(() => Position.create(0, NaN)).toThrow('Position y must be a finite number');
  });

  it('throws when x is Infinity', () => {
    expect(() => Position.create(Infinity, 0)).toThrow('Position x must be a finite number');
  });

  it('throws when y is -Infinity', () => {
    expect(() => Position.create(0, -Infinity)).toThrow('Position y must be a finite number');
  });

  it('adds two positions', () => {
    const a = Position.create(1, 2);
    const b = Position.create(3, 4);

    expect(a.add(b)).toEqual(Position.create(4, 6));
  });

  it('subtracts two positions', () => {
    const a = Position.create(5, 8);
    const b = Position.create(2, 3);

    expect(a.subtract(b)).toEqual(Position.create(3, 5));
  });

  it('scales both coordinates', () => {
    const position = Position.create(4, 6);

    expect(position.scale(2)).toEqual(Position.create(8, 12));
  });

  it('scales by fractional factors', () => {
    const position = Position.create(10, 20);

    expect(position.scale(0.5)).toEqual(Position.create(5, 10));
  });

  it('throws when scale factor is not finite', () => {
    expect(() => Position.create(1, 2).scale(NaN)).toThrow(
      'Position factor must be a finite number',
    );
    expect(() => Position.create(1, 2).scale(Infinity)).toThrow(
      'Position factor must be a finite number',
    );
  });

  it('compares equality correctly', () => {
    const a = Position.create(1, 2);
    const b = Position.create(1, 2);
    const c = Position.create(2, 1);

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('converts to string', () => {
    const position = Position.create(1, 2);

    expect(position.toString()).toBe('Position(1, 2)');
  });

  it('serializes to JSON', () => {
    const position = Position.create(7, 8);

    expect(position.toJSON()).toEqual({ x: 7, y: 8 });
  });
});
