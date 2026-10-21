import { readFileSync } from 'node:fs';
import path from 'node:path';

const BRAND_THEME_CSS = readFileSync(
  path.resolve(__dirname, '../../../../presentation/styles/brand/brand-theme.css'),
  'utf8',
);

describe('accessibility preference tokens', () => {
  it('scales every font size through the account scale', () => {
    expect(BRAND_THEME_CSS).toContain('--cach-font-scale: 1;');
    expect(BRAND_THEME_CSS).toContain('--rr-font-size-base: calc(16px * var(--cach-font-scale));');
    expect(BRAND_THEME_CSS).toContain('--rr-font-size-5xl: calc(61px * var(--cach-font-scale));');
  });

  it('declares one scale per non-default font size', () => {
    expect(BRAND_THEME_CSS).toContain(":root[data-font-size='sm']");
    expect(BRAND_THEME_CSS).toContain(":root[data-font-size='lg']");
    expect(BRAND_THEME_CSS).toContain(":root[data-font-size='xl']");
    expect(BRAND_THEME_CSS).not.toContain(":root[data-font-size='base']");
  });

  it('mirrors prefers-reduced-motion when the account asks for it', () => {
    expect(BRAND_THEME_CSS).toContain(":root[data-reduced-motion='true']");
    expect(BRAND_THEME_CSS).toContain('--rr-motion-behavior-default: none;');
    expect(BRAND_THEME_CSS).toContain('--rr-motion-duration-base: 0ms;');
    expect(BRAND_THEME_CSS).toContain('animation-duration: 0.01ms !important;');
  });
});
