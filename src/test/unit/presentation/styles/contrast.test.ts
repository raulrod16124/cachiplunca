import {
  contrastRatio,
  requiredContrast,
  semantic,
  type PairKind,
  type SemanticToken,
} from '@raulrod/tokens';

/**
 * Every foreground/background pair the application paints, expressed with the
 * semantic token vocabulary the palette is defined in. The audit proves each
 * pair meets WCAG 2.1 AA in both themes, so a token change cannot silently
 * regress contrast. Keep it in sync with the styled components under
 * `src/presentation`.
 */
interface PaintedPair {
  readonly fg: SemanticToken;
  readonly bg: SemanticToken;
  readonly kind: PairKind;
  readonly where: string;
}

const PAINTED_PAIRS: readonly PaintedPair[] = [
  {
    fg: 'color.text.primary',
    bg: 'color.background.default',
    kind: 'text',
    where: 'text/note/frame/task/link renderers, toolbar and viewport controls',
  },
  {
    fg: 'color.text.primary',
    bg: 'color.background.surface',
    kind: 'text',
    where: 'frame header, workspaces list rows',
  },
  {
    fg: 'color.text.muted',
    bg: 'color.background.sunken',
    kind: 'text',
    where: 'task metadata',
  },
  {
    fg: 'color.text.muted',
    bg: 'color.background.default',
    kind: 'text',
    where: 'canvas keyboard hint',
  },
  {
    fg: 'color.text.danger',
    bg: 'color.background.default',
    kind: 'text',
    where: 'field error message',
  },
  {
    fg: 'color.text.danger',
    bg: 'color.background.surface',
    kind: 'text',
    where: 'field error message on a surface',
  },
  {
    fg: 'color.link.text',
    bg: 'color.background.default',
    kind: 'text',
    where: 'link renderer url',
  },
  {
    fg: 'color.border.primary',
    bg: 'color.background.default',
    kind: 'non-text',
    where: 'canvas selection outline',
  },
  {
    fg: 'color.border.strong',
    bg: 'color.background.default',
    kind: 'non-text',
    where: 'connector stroke and strong element boundary',
  },
  {
    fg: 'color.focus.ring',
    bg: 'color.background.default',
    kind: 'non-text',
    where: 'canvas focus ring',
  },
  {
    fg: 'color.action.primary.background',
    bg: 'color.background.default',
    kind: 'non-text',
    where: 'spinner ring',
  },
];

const THEMES = ['light', 'dark'] as const;

interface ThemePair {
  readonly light: string;
  readonly dark: string;
}

/** Reads a semantic token's per-theme hex, failing loudly on scalar tokens. */
function themePair(key: SemanticToken): ThemePair {
  const value = semantic[key];
  if (typeof value !== 'object' || value === null) {
    throw new Error(`Semantic token ${key} is not a color pair`);
  }
  return value;
}

describe('app color contrast', () => {
  it.each(PAINTED_PAIRS)('meets WCAG AA for $fg on $bg ($kind) — $where', ({ fg, bg, kind }) => {
    const threshold = requiredContrast(kind);
    const foreground = themePair(fg);
    const background = themePair(bg);

    for (const theme of THEMES) {
      const ratio = contrastRatio(foreground[theme], background[theme]);
      expect(ratio).toBeGreaterThanOrEqual(threshold);
    }
  });
});
