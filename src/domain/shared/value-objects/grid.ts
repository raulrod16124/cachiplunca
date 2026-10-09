import { Position } from './position';
import { Transform } from './transform';

export const DEFAULT_GRID_SPACING = 40;

export class Grid {
  private readonly _spacing: number;

  private constructor(spacing: number) {
    this._spacing = spacing;
  }

  static create(spacing: number): Grid {
    Grid.validateSpacing(spacing);
    return new Grid(spacing);
  }

  static of(spacing: number): Grid {
    return Grid.create(spacing);
  }

  static default(): Grid {
    return new Grid(DEFAULT_GRID_SPACING);
  }

  private static validateSpacing(spacing: number): void {
    if (!Number.isFinite(spacing)) {
      throw new Error('Grid spacing must be a finite number');
    }
    if (spacing <= 0) {
      throw new Error('Grid spacing must be greater than zero');
    }
  }

  private static validateScale(scale: number): void {
    if (!Number.isFinite(scale)) {
      throw new Error('Grid scale must be a finite number');
    }
    if (scale <= 0) {
      throw new Error('Grid scale must be greater than zero');
    }
  }

  get spacing(): number {
    return this._spacing;
  }

  scaledSpacing(scale: number): number {
    Grid.validateScale(scale);
    return this._spacing * scale;
  }

  offsetFor(transform: Transform): Position {
    const step = this.scaledSpacing(transform.scale);
    const worldOriginX = -transform.x * transform.scale;
    const worldOriginY = -transform.y * transform.scale;

    return Position.create(
      Grid.positiveModulo(worldOriginX, step),
      Grid.positiveModulo(worldOriginY, step),
    );
  }

  private static positiveModulo(value: number, modulus: number): number {
    return ((value % modulus) + modulus) % modulus;
  }

  equals(other: Grid): boolean {
    return this._spacing === other._spacing;
  }

  toString(): string {
    return `Grid(spacing=${this._spacing})`;
  }
}
