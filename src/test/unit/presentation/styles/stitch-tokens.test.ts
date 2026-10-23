import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  contrastRatio,
  requiredContrast,
} from '../../../../presentation/styles/brand/brand-contrast';
import {
  stitchVar,
  stitchVarNames,
  type StitchVarName,
} from '../../../../presentation/styles/stitch';

const STITCH_THEME_CSS = readFileSync(
  path.resolve(__dirname, '../../../../presentation/styles/stitch/stitch-theme.css'),
  'utf8',
);

function extractBlock(css: string, selector: string): string {
  const start = css.indexOf(selector);
  if (start === -1) {
    return '';
  }

  const open = css.indexOf('{', start);
  let depth = 0;

  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') {
      depth += 1;
    } else if (css[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        return css.slice(open + 1, index);
      }
    }
  }

  return '';
}

const LIGHT_BLOCK = extractBlock(STITCH_THEME_CSS, "[data-surface='stitch']");
const DARK_BLOCK = extractBlock(STITCH_THEME_CSS, "[data-theme='dark'] [data-surface='stitch']");
const DARK_SCHEME_BLOCK = extractBlock(
  STITCH_THEME_CSS,
  ":root:not([data-theme]) [data-surface='stitch']",
);

function declarations(block: string): readonly string[] {
  return [...block.matchAll(/(--[\w-]+:\s*[^;]+;)/g)].map((match) =>
    (match[1] ?? '').replace(/\s+/g, ' ').trim(),
  );
}

const LIGHT_DECLARATIONS = declarations(LIGHT_BLOCK);
const DARK_DECLARATIONS = declarations(DARK_BLOCK);
const DARK_SCHEME_DECLARATIONS = declarations(DARK_SCHEME_BLOCK);

describe('stitch tokens', () => {
  it('maps typed token names to --stitch-* custom properties', () => {
    const name: StitchVarName = 'nav-active-bg';

    expect(stitchVar(name)).toBe('var(--stitch-nav-active-bg)');
    expect(stitchVar('favorite-ink')).toBe('var(--stitch-favorite-ink)');
  });

  it('declares every typed token in the light and dark scopes', () => {
    for (const name of stitchVarNames) {
      expect(LIGHT_BLOCK).toContain(`--stitch-${name}:`);
      if (!name.startsWith('font-') && !name.startsWith('radius-')) {
        expect(DARK_BLOCK).toContain(`--stitch-${name}:`);
        expect(DARK_SCHEME_BLOCK).toContain(`--stitch-${name}:`);
      }
    }
  });

  it('keeps the explicit dark theme and the prefers-color-scheme block in sync', () => {
    expect(DARK_DECLARATIONS.length).toBeGreaterThan(0);
    expect(DARK_SCHEME_DECLARATIONS).toEqual(DARK_DECLARATIONS);
  });

  it('overrides the @raulrod/ui palette inside the surface', () => {
    for (const declaration of [
      '--rr-color-action-primary-background: #a43700;',
      '--rr-color-background-default: #ffffff;',
      '--rr-font-family-sans: var(--stitch-font-body);',
    ]) {
      expect(LIGHT_DECLARATIONS).toContain(declaration);
    }

    for (const declaration of [
      '--rr-color-action-primary-background: #f59e0b;',
      '--rr-color-action-primary-text: #2a1700;',
      '--rr-color-action-secondary-text: #6ee7b7;',
      '--rr-color-background-default: #0e2319;',
    ]) {
      expect(DARK_DECLARATIONS).toContain(declaration);
    }
  });
});

interface StitchContrastPair {
  readonly id: string;
  readonly foreground: string;
  readonly background: string;
  readonly kind: 'text' | 'non-text';
}

const CONTRAST_PAIRS: readonly StitchContrastPair[] = [
  { id: 'light.text-on-page', foreground: '#1a1c1a', background: '#faf9f6', kind: 'text' },
  { id: 'light.muted-on-card', foreground: '#5a4138', background: '#ffffff', kind: 'text' },
  { id: 'light.primary-label', foreground: '#ffffff', background: '#a43700', kind: 'text' },
  { id: 'light.primary-hover-label', foreground: '#ffffff', background: '#cd4700', kind: 'text' },
  { id: 'light.secondary-on-card', foreground: '#486555', background: '#ffffff', kind: 'text' },
  { id: 'light.error-on-card', foreground: '#ba1a1a', background: '#ffffff', kind: 'text' },
  { id: 'light.nav-active', foreground: '#ffffff', background: '#0e2319', kind: 'text' },
  { id: 'light.favorite-icon', foreground: '#b45309', background: '#f7eee2', kind: 'non-text' },
  { id: 'light.focus-ring', foreground: '#a43700', background: '#faf9f6', kind: 'non-text' },
  { id: 'dark.text-on-page', foreground: '#ffffff', background: '#07130d', kind: 'text' },
  { id: 'dark.muted-on-card', foreground: '#a1a1aa', background: '#0e2319', kind: 'text' },
  { id: 'dark.primary-label', foreground: '#2a1700', background: '#f59e0b', kind: 'text' },
  { id: 'dark.primary-hover-label', foreground: '#2a1700', background: '#d97706', kind: 'text' },
  { id: 'dark.secondary-on-card', foreground: '#34d399', background: '#0e2319', kind: 'text' },
  { id: 'dark.error-on-card', foreground: '#f87171', background: '#0e2319', kind: 'text' },
  { id: 'dark.nav-active', foreground: '#6ee7b7', background: '#0d281e', kind: 'text' },
  { id: 'dark.open-label', foreground: '#6ee7b7', background: '#071911', kind: 'text' },
  { id: 'dark.footer', foreground: '#a1a1aa', background: '#091610', kind: 'text' },
  { id: 'dark.favorite-icon', foreground: '#f59e0b', background: '#091610', kind: 'non-text' },
  { id: 'dark.focus-ring', foreground: '#f59e0b', background: '#07130d', kind: 'non-text' },
];

describe('stitch contrast', () => {
  it.each(CONTRAST_PAIRS)('meets $kind threshold for $id', ({ foreground, background, kind }) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(requiredContrast(kind));
  });

  it('declares every contrast color in the theme layer', () => {
    for (const pair of CONTRAST_PAIRS) {
      expect(STITCH_THEME_CSS.toLowerCase()).toContain(pair.background.toLowerCase());
      expect(STITCH_THEME_CSS.toLowerCase()).toContain(pair.foreground.toLowerCase());
    }
  });
});
