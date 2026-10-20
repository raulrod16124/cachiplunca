import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  brandPrimitives,
  brandVar,
  type BrandPrimitiveKey,
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

  it('does not leave the default blue palette in the brand layer', () => {
    expect(BRAND_THEME_CSS).not.toContain('#2563eb');
    expect(BRAND_THEME_CSS).not.toContain('#155dfc');
  });
});
