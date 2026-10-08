import { Position } from './position';
import { Size } from './size';
import { Transform } from './transform';

export class Viewport {
  private readonly _transform: Transform;
  private readonly _size: Size;

  private constructor(transform: Transform, size: Size) {
    this._transform = transform;
    this._size = size;
  }

  static create(transform: Transform, size: Size): Viewport {
    return new Viewport(transform, size);
  }

  static of(transform: Transform, size: Size): Viewport {
    return Viewport.create(transform, size);
  }

  static default(size: Size): Viewport {
    return Viewport.create(Transform.identity(), size);
  }

  get transform(): Transform {
    return this._transform;
  }

  get size(): Size {
    return this._size;
  }

  get scale(): number {
    return this._transform.scale;
  }

  worldToScreen(point: Position): Position {
    const x = (point.x - this._transform.x) * this._transform.scale;
    const y = (point.y - this._transform.y) * this._transform.scale;

    return Position.create(x, y);
  }

  screenToWorld(point: Position): Position {
    const x = point.x / this._transform.scale + this._transform.x;
    const y = point.y / this._transform.scale + this._transform.y;

    return Position.create(x, y);
  }

  equals(other: Viewport): boolean {
    return this._transform.equals(other._transform) && this._size.equals(other._size);
  }

  toString(): string {
    return `Viewport(${this._transform.toString()}, ${this._size.toString()})`;
  }

  toJSON(): { transform: { x: number; y: number; scale: number }; width: number; height: number } {
    return {
      transform: this._transform.toJSON(),
      width: this._size.width,
      height: this._size.height,
    };
  }
}
