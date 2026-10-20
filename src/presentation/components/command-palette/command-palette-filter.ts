import { normalizeSearchText } from '../../../application/services';
import type { CommandPaletteGroup, CommandPaletteItem } from './command-palette.types';

function itemMatches(item: CommandPaletteItem, normalizedQuery: string): boolean {
  if (normalizedQuery.length === 0) {
    return true;
  }

  const haystack = normalizeSearchText(
    [item.label, item.description ?? '', item.keywords ?? ''].join(' '),
  );

  return haystack.includes(normalizedQuery);
}

export function filterCommandPaletteGroups(
  groups: readonly CommandPaletteGroup[],
  query: string,
): readonly CommandPaletteGroup[] {
  const normalizedQuery = normalizeSearchText(query);

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => itemMatches(item, normalizedQuery)),
    }))
    .filter((group) => group.items.length > 0);
}

export function flattenCommandPaletteGroups(
  groups: readonly CommandPaletteGroup[],
): readonly CommandPaletteItem[] {
  return groups.flatMap((group) => group.items);
}

export function firstEnabledCommandPaletteIndex(items: readonly CommandPaletteItem[]): number {
  return items.findIndex((item) => item.disabled !== true);
}

export function nextEnabledCommandPaletteIndex(
  items: readonly CommandPaletteItem[],
  currentIndex: number,
  direction: 1 | -1,
): number {
  if (items.length === 0) {
    return -1;
  }

  const start = currentIndex < 0 ? (direction === 1 ? -1 : 0) : currentIndex;

  for (let step = 1; step <= items.length; step += 1) {
    const candidate = (start + direction * step + items.length * 2) % items.length;
    const item = items[candidate];

    if (item !== undefined && item.disabled !== true) {
      return candidate;
    }
  }

  return -1;
}
