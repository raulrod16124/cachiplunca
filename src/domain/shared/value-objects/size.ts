export class Size {
  private readonly _width: number;
  private readonly _height: number;

  private constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
  }

  static create(width: number, height: number): Size {
    Size.validateDimension(width, 'width');
    Size.validateDimension(height, 'height');
    return new Size(width, height);
  }

  static of(width: number, height: number): Size {
    return Size.create(width, height);
  }

  private static validateDimension(value: number, name: string): void {
    if (!Number.isFinite(value)) {
      throw new Error(`Size ${name} must be a finite number`);
    }
    if (value < 0) {
      throw new Error(`Size ${name} cannot be negative`);
    }
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  area(): number {
    return this._width * this._height;
  }

  isEmpty(): boolean {
    return this._width === 0 || this._height === 0;
  }

  equals(other: Size): boolean {
    return this._width === other._width && this._height === other._height;
  }

  toString(): string {
    return `Size(${this._width}, ${this._height})`;
  }

  toJSON(): { width: number; height: number } {
    return { width: this._width, height: this._height };
  }
}
