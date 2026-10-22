import { Position, type Size, type Viewport } from '../../domain/shared';

export interface DropCreatePositionInput {
  readonly screenPoint: Position;
  readonly viewport: Viewport;
  readonly size: Size;
}

export function resolveDropCreatePosition({
  screenPoint,
  viewport,
  size,
}: DropCreatePositionInput): Position {
  const dropPoint = viewport.screenToWorld(screenPoint);
  const visibleTopLeft = viewport.screenToWorld(Position.create(0, 0));
  const visibleBottomRight = viewport.screenToWorld(
    Position.create(viewport.size.width, viewport.size.height),
  );

  return Position.create(
    clampInsideVisibleArea(
      dropPoint.x - size.width / 2,
      visibleTopLeft.x,
      visibleBottomRight.x - size.width,
    ),
    clampInsideVisibleArea(
      dropPoint.y - size.height / 2,
      visibleTopLeft.y,
      visibleBottomRight.y - size.height,
    ),
  );
}

function clampInsideVisibleArea(value: number, visibleStart: number, visibleEnd: number): number {
  if (visibleEnd < visibleStart) {
    return visibleStart;
  }

  return Math.min(Math.max(value, visibleStart), visibleEnd);
}
