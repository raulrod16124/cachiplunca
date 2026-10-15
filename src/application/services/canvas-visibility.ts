import type { Bounds } from '../../domain/shared';

export interface CanvasVisibilityItem {
  id: string;
  bounds: Bounds;
}

export function getVisibleElementIds(
  elements: readonly CanvasVisibilityItem[],
  visibleWorld: Bounds,
  margin = 0,
): readonly string[] {
  if (elements.length === 0) return [];
  if (!Number.isFinite(margin) || margin < 0) {
    margin = 0;
  }

  const visible: string[] = [];
  const vw = visibleWorld;
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const b = el.bounds;
    if (
      b.x + b.width >= vw.x - margin &&
      b.x <= vw.x + vw.width + margin &&
      b.y + b.height >= vw.y - margin &&
      b.y <= vw.y + vw.height + margin
    ) {
      visible.push(el.id);
    }
  }
  return visible;
}
