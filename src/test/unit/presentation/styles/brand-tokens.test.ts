import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  brandFontVar,
  brandPrimitives,
  brandTypography,
  brandVar,
  type BrandPrimitiveKey,
  type BrandTypographyKey,
} from '../../../../presentation/styles/brand/brand-tokens';

const BRAND_THEME_CSS = readFileSync(
  path.resolve(__dirname, '../../../../presentation/styles/brand/brand-theme.css'),
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

function declarations(block: string): readonly string[] {
  return [...block.matchAll(/(--[\w-]+:\s*[^;]+;)/g)].map((match) =>
    (match[1] ?? '').replace(/\s+/g, ' ').trim(),
  );
}

const LIGHT_THEME_DECLARATIONS = declarations(
  extractBlock(BRAND_THEME_CSS, ":root[data-theme='light']"),
);
const LIGHT_SCHEME_DECLARATIONS = declarations(
  extractBlock(BRAND_THEME_CSS, '@media (prefers-color-scheme: light)'),
);
const DARK_THEME_DECLARATIONS = declarations(
  extractBlock(BRAND_THEME_CSS, ":root[data-theme='dark']"),
);
const DARK_SCHEME_DECLARATIONS = declarations(
  extractBlock(BRAND_THEME_CSS, '@media (prefers-color-scheme: dark)'),
);

describe('brand tokens', () => {
  it('maps primitive keys to --cach-* custom properties', () => {
    const key: BrandPrimitiveKey = 'green-900';

    expect(brandVar(key)).toBe('var(--cach-green-900)');
    expect(brandVar('cream-0')).toBe('var(--cach-cream-0)');
  });

  it('declares every typed primitive in brand-theme.css', () => {
    for (const [key, value] of Object.entries(brandPrimitives)) {
      expect(BRAND_THEME_CSS).toContain(`--cach-${key}: ${value};`);
    }
  });

  it('maps typography keys to --cach-font-* custom properties', () => {
    const key: BrandTypographyKey = 'font-display';

    expect(brandFontVar(key)).toBe('var(--cach-font-display)');
  });

  it('declares the display stack in brand-theme.css', () => {
    expect(BRAND_THEME_CSS).toContain(`--cach-font-display: ${brandTypography['font-display']};`);
  });

  it('does not leave the default blue palette in the brand layer', () => {
    expect(BRAND_THEME_CSS).not.toContain('#2563eb');
    expect(BRAND_THEME_CSS).not.toContain('#155dfc');
  });

  it('uses white surfaces, neutral sunken panels and a distinct board color in light', () => {
    for (const declaration of [
      '--rr-color-background-default: var(--cach-white);',
      '--rr-color-background-surface: var(--cach-white);',
      '--rr-color-background-sunken: var(--cach-neutral-100);',
      '--cach-canvas-surface: var(--cach-board-green-100);',
      '--rr-color-border-default: var(--cach-sand-600);',
    ]) {
      expect(LIGHT_THEME_DECLARATIONS).toContain(declaration);
      expect(LIGHT_SCHEME_DECLARATIONS).toContain(declaration);
    }
  });

  it('uses logo colors for light accents', () => {
    for (const declaration of [
      '--cach-surface-sidebar: var(--cach-white);',
      '--cach-surface-nav-active: var(--cach-green-900);',
      '--cach-nav-active-text: var(--cach-white);',
      '--cach-nav-accent: var(--cach-mustard-500);',
      '--cach-card-icon-green: var(--cach-green-900);',
      '--cach-card-icon-peach: var(--cach-orange-500);',
      '--cach-card-icon-mustard: var(--cach-mustard-500);',
      '--cach-surface-empty: var(--cach-green-900);',
      '--cach-border-accent: var(--cach-orange-600);',
    ]) {
      expect(LIGHT_THEME_DECLARATIONS).toContain(declaration);
      expect(LIGHT_SCHEME_DECLARATIONS).toContain(declaration);
    }
  });

  it('defines a three-level dark surface scale and shares the board page color', () => {
    expect(BRAND_THEME_CSS).toContain('--cach-dark-default: #0f1b16;');
    expect(BRAND_THEME_CSS).toContain('--cach-dark-surface: #17261f;');
    expect(BRAND_THEME_CSS).toContain('--cach-dark-sunken: #22352b;');

    for (const declaration of [
      '--rr-color-background-default: var(--cach-dark-default);',
      '--rr-color-background-surface: var(--cach-dark-surface);',
      '--rr-color-background-sunken: var(--cach-dark-sunken);',
      '--cach-canvas-surface: var(--cach-dark-default);',
      '--cach-floating-surface: var(--cach-dark-surface);',
      '--cach-floating-surface-muted: var(--cach-dark-sunken);',
    ]) {
      expect(DARK_THEME_DECLARATIONS).toContain(declaration);
      expect(DARK_SCHEME_DECLARATIONS).toContain(declaration);
    }
  });

  it('uses brand accents instead of neutral surfaces in dark', () => {
    for (const declaration of [
      '--cach-surface-sidebar: var(--cach-dark-sidebar);',
      '--cach-surface-nav-active: var(--cach-green-900);',
      '--cach-nav-active-text: var(--cach-cream-50);',
      '--cach-nav-accent: var(--cach-mustard-500);',
      '--cach-card-icon-green: var(--cach-green-900);',
      '--cach-card-icon-green-fg: var(--cach-cream-50);',
      '--cach-card-icon-peach: var(--cach-orange-500);',
      '--cach-card-icon-peach-fg: var(--cach-graphite-900);',
      '--cach-card-icon-mustard: var(--cach-mustard-500);',
      '--cach-card-icon-mustard-fg: var(--cach-graphite-900);',
      '--cach-icon-accent: var(--cach-mustard-500);',
      '--cach-surface-empty: var(--cach-green-900);',
      '--cach-border-accent: var(--cach-orange-500);',
      '--cach-shell-border: var(--cach-dark-shell-border);',
    ]) {
      expect(DARK_THEME_DECLARATIONS).toContain(declaration);
      expect(DARK_SCHEME_DECLARATIONS).toContain(declaration);
    }
  });

  it('keeps the explicit dark theme and the prefers-color-scheme block in sync', () => {
    expect(DARK_THEME_DECLARATIONS.length).toBeGreaterThan(0);
    expect(new Set(DARK_SCHEME_DECLARATIONS)).toEqual(new Set(DARK_THEME_DECLARATIONS));
  });

  it('adds a subtle texture pattern only to dark surfaces', () => {
    expect(BRAND_THEME_CSS).toContain('--cach-surface-page-pattern: none;');
    expect(BRAND_THEME_CSS).toContain('--cach-surface-sidebar-pattern: none;');

    for (const declaration of DARK_THEME_DECLARATIONS) {
      if (
        declaration.startsWith('--cach-surface-page-pattern:') ||
        declaration.startsWith('--cach-surface-sidebar-pattern:')
      ) {
        expect(declaration).toContain('radial-gradient(');
        expect(declaration).not.toContain('none');
      }
    }
  });

  it('defines distinct neutral control hover surfaces for light and dark', () => {
    expect(BRAND_THEME_CSS).toContain('--cach-control-hover: var(--cach-neutral-100);');
    expect(BRAND_THEME_CSS.match(/--cach-control-hover: color-mix\(/g) ?? []).toHaveLength(2);
    expect(BRAND_THEME_CSS).toContain('var(--cach-olive-500) 28%');
  });
});
