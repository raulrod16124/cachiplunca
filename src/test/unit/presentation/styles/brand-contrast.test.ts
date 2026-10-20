import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  BRAND_CONTRAST_PAIRS,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
  contrastRatio,
  relativeLuminance,
  requiredContrast,
} from '../../../../presentation/styles/brand/brand-contrast';

const BRAND_THEME_CSS = readFileSync(
  path.resolve(__dirname, '../../../../presentation/styles/brand/brand-theme.css'),
  'utf8',
);

describe('brand contrast math', () => {
  it('computes WCAG relative luminance', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 10);
  });

  it('computes the WCAG contrast ratio', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 10);
    expect(contrastRatio('#173e2c', '#173e2c')).toBe(1);
  });

  it('rejects values that are not #RRGGBB hex colors', () => {
    expect(() => relativeLuminance('red')).toThrow('is not a #RRGGBB hex color');
    expect(() => contrastRatio('#fff', '#000000')).toThrow('is not a #RRGGBB hex color');
  });

  it('applies the WCAG 2.1 AA thresholds by pair kind', () => {
    expect(requiredContrast('text')).toBe(TEXT_CONTRAST_MIN);
    expect(requiredContrast('text')).toBe(4.5);
    expect(requiredContrast('non-text')).toBe(NON_TEXT_CONTRAST_MIN);
    expect(requiredContrast('non-text')).toBe(3);
  });
});

describe('brand contrast pairs', () => {
  it('defines at least 20 brand pairs', () => {
    expect(BRAND_CONTRAST_PAIRS.length).toBeGreaterThanOrEqual(20);
  });

  it('has unique pair ids', () => {
    const ids = BRAND_CONTRAST_PAIRS.map((pair) => pair.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers both themes', () => {
    const themes = new Set(BRAND_CONTRAST_PAIRS.map((pair) => pair.theme));

    expect(themes).toEqual(new Set(['light', 'dark']));
  });

  it('covers text and non-text pairs', () => {
    const kinds = new Set(BRAND_CONTRAST_PAIRS.map((pair) => pair.kind));

    expect(kinds).toEqual(new Set(['text', 'non-text']));
  });

  it('covers focus rings and borders', () => {
    const ids = BRAND_CONTRAST_PAIRS.map((pair) => pair.id);

    expect(ids.some((id) => id.includes('focus-ring'))).toBe(true);
    expect(ids.some((id) => id.includes('border-default'))).toBe(true);
    expect(ids.some((id) => id.includes('border-strong'))).toBe(true);
  });

  it.each(BRAND_CONTRAST_PAIRS)(
    'meets $kind threshold for $id — $foreground on $background ($where)',
    ({ foreground, background, kind }) => {
      const ratio = contrastRatio(foreground, background);

      expect(ratio).toBeGreaterThanOrEqual(requiredContrast(kind));
    },
  );

  it.each([...new Set(BRAND_CONTRAST_PAIRS.flatMap((pair) => [pair.foreground, pair.background]))])(
    'declares %s in brand-theme.css',
    (color) => {
      expect(BRAND_THEME_CSS).toContain(color);
    },
  );
});
