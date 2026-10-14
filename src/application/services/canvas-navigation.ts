import type { SelectableItem } from './canvas-hit-test';

export type NavigationDirection = 'up' | 'down' | 'left' | 'right';

export interface NavigationKeyInput {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
}

export interface NavigationKeyCommand {
  readonly direction: NavigationDirection;
  readonly additive: boolean;
}

const ARROW_DIRECTIONS: Readonly<Record<string, NavigationDirection>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

const LATERAL_PENALTY = 2;
const CANDIDATE_EPSILON = 0.001;

export function resolveNavigationKey(input: NavigationKeyInput): NavigationKeyCommand | null {
  if (input.ctrlKey || input.metaKey || input.altKey) {
    return null;
  }

  const direction = ARROW_DIRECTIONS[input.key];

  if (direction === undefined) {
    return null;
  }

  return { direction, additive: input.shiftKey };
}

interface ProjectedCandidate {
  readonly id: string;
  readonly primary: number;
  readonly secondary: number;
  readonly index: number;
}

function project(
  item: SelectableItem,
  anchor: SelectableItem,
  direction: NavigationDirection,
): { readonly primary: number; readonly secondary: number } {
  const dx = item.bounds.centerX - anchor.bounds.centerX;
  const dy = item.bounds.centerY - anchor.bounds.centerY;

  switch (direction) {
    case 'right':
      return { primary: dx, secondary: Math.abs(dy) };
    case 'left':
      return { primary: -dx, secondary: Math.abs(dy) };
    case 'down':
      return { primary: dy, secondary: Math.abs(dx) };
    case 'up':
      return { primary: -dy, secondary: Math.abs(dx) };
  }
}

function score(candidate: ProjectedCandidate): number {
  return candidate.primary + candidate.secondary * LATERAL_PENALTY;
}

function isBetter(candidate: ProjectedCandidate, current: ProjectedCandidate): boolean {
  const candidateScore = score(candidate);
  const currentScore = score(current);

  if (candidateScore !== currentScore) {
    return candidateScore < currentScore;
  }

  if (candidate.secondary !== current.secondary) {
    return candidate.secondary < current.secondary;
  }

  if (candidate.primary !== current.primary) {
    return candidate.primary < current.primary;
  }

  return candidate.index < current.index;
}

export function findNextSelectable(
  items: readonly SelectableItem[],
  currentId: string | null,
  direction: NavigationDirection,
): string | null {
  if (items.length === 0) {
    return null;
  }

  const anchor = currentId === null ? undefined : items.find((item) => item.id === currentId);

  if (anchor === undefined) {
    return items[0]?.id ?? null;
  }

  let best: ProjectedCandidate | null = null;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    if (item === undefined || item.id === anchor.id) {
      continue;
    }

    const projected = project(item, anchor, direction);

    if (projected.primary <= CANDIDATE_EPSILON) {
      continue;
    }

    const candidate: ProjectedCandidate = {
      id: item.id,
      primary: projected.primary,
      secondary: projected.secondary,
      index,
    };

    if (best === null || isBetter(candidate, best)) {
      best = candidate;
    }
  }

  return best === null ? null : best.id;
}
