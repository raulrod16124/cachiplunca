/**
 * Distinct, accessible identity colors for workspace participants. Every entry
 * keeps at least 4.9:1 contrast against white text, so labels and initials stay
 * legible in both light and dark themes and color is never the only signal.
 */
export const PRESENCE_COLOR_PALETTE: readonly string[] = [
  '#334155',
  '#b91c1c',
  '#c2410c',
  '#b45309',
  '#854d0e',
  '#4d7c0f',
  '#15803d',
  '#047857',
  '#0f766e',
  '#0e7490',
  '#0369a1',
  '#1d4ed8',
  '#4338ca',
  '#6d28d9',
  '#7e22ce',
  '#a21caf',
  '#be185d',
  '#be123c',
];

export interface PresenceColorAssigner {
  /**
   * Returns the session color for a user. The first palette-size distinct
   * users always receive different colors; repeated users keep their color.
   * Beyond the palette size the least-used entry is chosen (repetition is
   * unavoidable), while names/initials keep participants distinguishable.
   */
  colorFor(userId: string): string;
}

export function createPresenceColorAssigner(
  palette: readonly string[] = PRESENCE_COLOR_PALETTE,
): PresenceColorAssigner {
  if (palette.length === 0) {
    throw new Error('Presence palette must contain at least one color');
  }

  const assigned = new Map<string, string>();
  const usage = new Map<string, number>();

  return {
    colorFor(userId) {
      const existing = assigned.get(userId);

      if (existing !== undefined) {
        return existing;
      }

      const start = hashUserId(userId) % palette.length;
      let chosen = palette[start];
      let chosenUsage = usage.get(chosen) ?? 0;

      for (let offset = 0; offset < palette.length; offset += 1) {
        const candidate = palette[(start + offset) % palette.length];
        const candidateUsage = usage.get(candidate) ?? 0;

        if (candidateUsage === 0) {
          chosen = candidate;
          chosenUsage = 0;
          break;
        }

        if (candidateUsage < chosenUsage) {
          chosen = candidate;
          chosenUsage = candidateUsage;
        }
      }

      assigned.set(userId, chosen);
      usage.set(chosen, chosenUsage + 1);

      return chosen;
    },
  };
}

/**
 * Deterministic color for contexts that do not receive an allocator (e.g. a
 * standalone remote-cursor overlay). It may collide; shared surfaces should
 * use the session allocator so a user's avatar and cursor always match.
 */
export function presenceColorFor(
  userId: string,
  palette: readonly string[] = PRESENCE_COLOR_PALETTE,
): string {
  if (palette.length === 0) {
    throw new Error('Presence palette must contain at least one color');
  }

  return palette[hashUserId(userId) % palette.length];
}

function hashUserId(userId: string): number {
  let hash = 2166136261;

  for (let index = 0; index < userId.length; index += 1) {
    hash ^= userId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
