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

  it('uses white surfaces, neutral sunken panels and a distinct board color', () => {
    expect(
      BRAND_THEME_CSS.match(/--rr-color-background-default: var\(--cach-white\);/g),
    ).toHaveLength(2);
    expect(
      BRAND_THEME_CSS.match(/--rr-color-background-surface: var\(--cach-white\);/g),
    ).toHaveLength(2);
    expect(
      BRAND_THEME_CSS.match(/--rr-color-background-sunken: var\(--cach-neutral-100\);/g),
    ).toHaveLength(2);
    expect(
      BRAND_THEME_CSS.match(/--cach-canvas-surface: var\(--cach-board-green-100\);/g),
    ).toHaveLength(2);
    expect(
      BRAND_THEME_CSS.match(/--rr-color-border-default: var\(--cach-sand-600\);/g),
    ).toHaveLength(2);
  });

  it('uses logo colors for light accents while dark stays neutral', () => {
    for (const token of [
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
      expect(
        BRAND_THEME_CSS.match(new RegExp(token.replace(/[()[\]]/g, '\\$&'), 'g')),
      ).toHaveLength(2);
    }

    expect(BRAND_THEME_CSS).toContain(
      '--cach-surface-sidebar: var(--rr-color-background-surface);',
    );
    expect(BRAND_THEME_CSS).toContain(
      '--cach-surface-nav-active: var(--rr-color-background-sunken);',
    );
    expect(BRAND_THEME_CSS).toContain('--cach-nav-active-text: var(--rr-color-text-primary);');
    expect(BRAND_THEME_CSS).toContain('--cach-canvas-surface: var(--rr-color-background-default);');
    expect(BRAND_THEME_CSS).toContain(
      '--cach-floating-surface: var(--rr-color-background-default);',
    );
    expect(BRAND_THEME_CSS).toContain(
      '--cach-floating-surface-muted: var(--rr-color-background-surface);',
    );
  });

  it('defines distinct neutral control hover surfaces for light and dark', () => {
    expect(BRAND_THEME_CSS).toContain('--cach-control-hover: var(--cach-neutral-100);');
    expect(BRAND_THEME_CSS.match(/--cach-control-hover: color-mix\(/g) ?? []).toHaveLength(2);
    expect(BRAND_THEME_CSS).toContain('var(--cach-olive-500) 28%');
  });
});
