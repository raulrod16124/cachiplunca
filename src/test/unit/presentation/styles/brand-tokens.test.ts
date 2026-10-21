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

  it('defines distinct neutral control hover surfaces for light and dark', () => {
    expect(BRAND_THEME_CSS).toContain('--cach-control-hover: var(--cach-sand-200);');
    expect(BRAND_THEME_CSS.match(/--cach-control-hover: color-mix\(/g) ?? []).toHaveLength(2);
    expect(BRAND_THEME_CSS).toContain('var(--cach-olive-500) 28%');
  });
});
