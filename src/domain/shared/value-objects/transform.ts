import { Position } from './position';

export class Transform {
  private readonly _translation: Position;
  private readonly _scale: number;

  private constructor(translation: Position, scale: number) {
    this._translation = translation;
    this._scale = scale;
  }

  static create(translation: Position, scale: number): Transform {
    Transform.validateScale(scale);
    return new Transform(translation, scale);
  }

  static of(translation: Position, scale: number): Transform {
    return Transform.create(translation, scale);
  }

  static identity(): Transform {
    return new Transform(Position.create(0, 0), 1);
  }

  private static validateScale(scale: number): void {
    if (!Number.isFinite(scale)) {
      throw new Error('Transform scale must be a finite number');
    }
    if (scale <= 0) {
      throw new Error('Transform scale must be greater than zero');
    }
  }

  get translation(): Position {
    return this._translation;
  }

  get scale(): number {
    return this._scale;
  }

  get x(): number {
    return this._translation.x;
  }

  get y(): number {
    return this._translation.y;
  }

  withTranslation(translation: Position): Transform {
    return new Transform(translation, this._scale);
  }

  withScale(scale: number): Transform {
    return Transform.create(this._translation, scale);
  }

  translate(delta: Position): Transform {
    return new Transform(this._translation.add(delta), this._scale);
  }

  equals(other: Transform): boolean {
    return this._scale === other._scale && this._translation.equals(other._translation);
  }

  toString(): string {
    return `Transform(${this._translation.toString()}, scale=${this._scale})`;
  }

  toJSON(): { x: number; y: number; scale: number } {
    return {
      x: this._translation.x,
      y: this._translation.y,
      scale: this._scale,
    };
  }
}
