import { DEFAULT_GRID_SPACING, Grid, Position, Transform } from '../../../../../domain/shared';

describe('Grid', () => {
  it('creates a grid with the given spacing', () => {
    const grid = Grid.create(25);

    expect(grid.spacing).toBe(25);
  });

  it('creates with of() factory method', () => {
    const grid = Grid.of(15);

    expect(grid.spacing).toBe(15);
  });

  it('creates a default grid', () => {
    const grid = Grid.default();

    expect(grid.spacing).toBe(DEFAULT_GRID_SPACING);
  });

  it('throws when spacing is zero', () => {
    expect(() => Grid.create(0)).toThrow('Grid spacing must be greater than zero');
  });

  it('throws when spacing is negative', () => {
    expect(() => Grid.create(-10)).toThrow('Grid spacing must be greater than zero');
  });

  it('throws when spacing is NaN', () => {
    expect(() => Grid.create(NaN)).toThrow('Grid spacing must be a finite number');
  });

  it('throws when spacing is Infinity', () => {
    expect(() => Grid.create(Infinity)).toThrow('Grid spacing must be a finite number');
  });

  it('scales the spacing by the viewport scale', () => {
    const grid = Grid.create(40);

    expect(grid.scaledSpacing(1)).toBe(40);
    expect(grid.scaledSpacing(2)).toBe(80);
    expect(grid.scaledSpacing(0.5)).toBe(20);
  });

  it('throws when scaling with an invalid scale', () => {
    const grid = Grid.create(40);

    expect(() => grid.scaledSpacing(0)).toThrow('Grid scale must be greater than zero');
    expect(() => grid.scaledSpacing(NaN)).toThrow('Grid scale must be a finite number');
  });

  it('aligns the offset to the world origin at identity transform', () => {
    const grid = Grid.create(40);
    const offset = grid.offsetFor(Transform.identity());

    expect(offset).toEqual(Position.create(0, 0));
  });

  it('aligns the offset for a panned and zoomed transform', () => {
    const grid = Grid.create(40);
    const transform = Transform.create(Position.create(30, -50), 2);
    const offset = grid.offsetFor(transform);

    const step = grid.scaledSpacing(transform.scale);
    const worldOriginX = -transform.x * transform.scale;
    const worldOriginY = -transform.y * transform.scale;

    expect(Math.abs((offset.x - worldOriginX) % step)).toBe(0);
    expect(Math.abs((offset.y - worldOriginY) % step)).toBe(0);
    expect(offset.x).toBeGreaterThanOrEqual(0);
    expect(offset.x).toBeLessThan(step);
    expect(offset.y).toBeGreaterThanOrEqual(0);
    expect(offset.y).toBeLessThan(step);
  });

  it('keeps the offset within one tile for negative translations', () => {
    const grid = Grid.create(40);
    const offset = grid.offsetFor(Transform.create(Position.create(-90, -130), 1));

    expect(offset.x).toBeGreaterThanOrEqual(0);
    expect(offset.x).toBeLessThan(40);
    expect(offset.y).toBeGreaterThanOrEqual(0);
    expect(offset.y).toBeLessThan(40);
  });

  it('compares equality by spacing', () => {
    const a = Grid.create(40);
    const b = Grid.create(40);
    const c = Grid.create(20);

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('converts to string', () => {
    expect(Grid.create(40).toString()).toBe('Grid(spacing=40)');
  });
});
