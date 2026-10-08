export class Position {
  private readonly _x: number;
  private readonly _y: number;

  private constructor(x: number, y: number) {
    this._x = x;
    this._y = y;
  }

  static create(x: number, y: number): Position {
    Position.validateCoordinate(x, 'x');
    Position.validateCoordinate(y, 'y');
    return new Position(x, y);
  }

  static of(x: number, y: number): Position {
    return Position.create(x, y);
  }

  private static validateCoordinate(value: number, name: string): void {
    if (!Number.isFinite(value)) {
      throw new Error(`Position ${name} must be a finite number`);
    }
  }

  get x(): number {
    return this._x;
  }

  get y(): number {
    return this._y;
  }

  add(other: Position): Position {
    return new Position(this._x + other._x, this._y + other._y);
  }

  subtract(other: Position): Position {
    return new Position(this._x - other._x, this._y - other._y);
  }

  equals(other: Position): boolean {
    return this._x === other._x && this._y === other._y;
  }

  toString(): string {
    return `Position(${this._x}, ${this._y})`;
  }

  toJSON(): { x: number; y: number } {
    return { x: this._x, y: this._y };
  }
}
