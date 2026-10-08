import { Position } from './position';
import { Size } from './size';

export class Bounds {
  private readonly _position: Position;
  private readonly _size: Size;

  private constructor(position: Position, size: Size) {
    this._position = position;
    this._size = size;
  }

  static create(position: Position, size: Size): Bounds {
    return new Bounds(position, size);
  }

  static of(position: Position, size: Size): Bounds {
    return Bounds.create(position, size);
  }

  static fromXYWH(x: number, y: number, width: number, height: number): Bounds {
    return Bounds.create(Position.create(x, y), Size.create(width, height));
  }

  get position(): Position {
    return this._position;
  }

  get size(): Size {
    return this._size;
  }

  get x(): number {
    return this._position.x;
  }

  get y(): number {
    return this._position.y;
  }

  get width(): number {
    return this._size.width;
  }

  get height(): number {
    return this._size.height;
  }

  get left(): number {
    return this._position.x;
  }

  get top(): number {
    return this._position.y;
  }

  get right(): number {
    return this._position.x + this._size.width;
  }

  get bottom(): number {
    return this._position.y + this._size.height;
  }

  get centerX(): number {
    return this._position.x + this._size.width / 2;
  }

  get centerY(): number {
    return this._position.y + this._size.height / 2;
  }

  contains(point: Position): boolean {
    return (
      point.x >= this.left && point.x <= this.right && point.y >= this.top && point.y <= this.bottom
    );
  }

  intersects(other: Bounds): boolean {
    return (
      this.left < other.right &&
      this.right > other.left &&
      this.top < other.bottom &&
      this.bottom > other.top
    );
  }

  union(other: Bounds): Bounds {
    const left = Math.min(this.left, other.left);
    const top = Math.min(this.top, other.top);
    const right = Math.max(this.right, other.right);
    const bottom = Math.max(this.bottom, other.bottom);

    return Bounds.fromXYWH(left, top, right - left, bottom - top);
  }

  equals(other: Bounds): boolean {
    return this._position.equals(other._position) && this._size.equals(other._size);
  }

  toString(): string {
    return `Bounds(${this._position.toString()}, ${this._size.toString()})`;
  }

  toJSON(): { x: number; y: number; width: number; height: number } {
    return {
      x: this._position.x,
      y: this._position.y,
      width: this._size.width,
      height: this._size.height,
    };
  }
}
