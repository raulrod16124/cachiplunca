import { Bounds } from './bounds';
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

  pan(screenDelta: Position): Viewport {
    const inverseScale = 1 / this._transform.scale;
    const worldDelta = screenDelta.scale(inverseScale);
    const newTranslation = this._transform.translation.subtract(worldDelta);

    return Viewport.create(this._transform.withTranslation(newTranslation), this._size);
  }

  zoom(factor: number, anchorScreen: Position): Viewport {
    Viewport.validateZoomFactor(factor);

    const newScale = this._transform.scale * factor;
    const worldAnchor = this.screenToWorld(anchorScreen);
    const newTranslation = Position.create(
      worldAnchor.x - anchorScreen.x / newScale,
      worldAnchor.y - anchorScreen.y / newScale,
    );

    return Viewport.create(
      this._transform.withScale(newScale).withTranslation(newTranslation),
      this._size,
    );
  }

  private static validateZoomFactor(factor: number): void {
    if (!Number.isFinite(factor)) {
      throw new Error('Zoom factor must be a finite number');
    }
    if (factor <= 0) {
      throw new Error('Zoom factor must be greater than zero');
    }
  }

  fit(bounds: Bounds, padding = 0, minScale?: number, maxScale?: number): Viewport {
    const availableWidth = this._size.width - padding * 2;
    const availableHeight = this._size.height - padding * 2;

    if (bounds.width <= 0 || bounds.height <= 0 || availableWidth <= 0 || availableHeight <= 0) {
      return Viewport.default(this._size);
    }

    const rawScale = Math.min(availableWidth / bounds.width, availableHeight / bounds.height);
    const scale = Viewport.clampScale(rawScale, minScale, maxScale);

    if (!Number.isFinite(scale) || scale <= 0) {
      return Viewport.default(this._size);
    }

    const translation = Position.create(
      bounds.centerX - this._size.width / (2 * scale),
      bounds.centerY - this._size.height / (2 * scale),
    );

    return Viewport.create(Transform.create(translation, scale), this._size);
  }

  private static clampScale(scale: number, minScale?: number, maxScale?: number): number {
    let result = scale;

    if (minScale !== undefined) {
      result = Math.max(result, minScale);
    }

    if (maxScale !== undefined) {
      result = Math.min(result, maxScale);
    }

    return result;
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
