import type { Bounds, Position } from '../../domain/shared';

export interface SelectableItem {
  readonly id: string;
  readonly bounds: Bounds;
}

export function findSelectableAt(
  items: readonly SelectableItem[],
  worldPoint: Position,
): string | null {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item !== undefined && item.bounds.contains(worldPoint)) {
      return item.id;
    }
  }

  return null;
}

export function findSelectablesInBounds(
  items: readonly SelectableItem[],
  worldBounds: Bounds,
): readonly string[] {
  const matches: string[] = [];

  for (const item of items) {
    if (item.bounds.intersects(worldBounds)) {
      matches.push(item.id);
    }
  }

  return matches;
}
