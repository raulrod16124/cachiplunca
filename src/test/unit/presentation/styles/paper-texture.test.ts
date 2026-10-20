import { readFileSync } from 'node:fs';
import path from 'node:path';

const BRAND_THEME_CSS = readFileSync(
  path.resolve(__dirname, '../../../../presentation/styles/brand/brand-theme.css'),
  'utf8',
);

const CLASS_BLOCK = BRAND_THEME_CSS.match(/\.cach-paper-texture\s*\{([\s\S]*?)\}/)?.[1] ?? '';

describe('paper texture', () => {
  it('declares the reusable texture class', () => {
    expect(CLASS_BLOCK).not.toBe('');
    expect(CLASS_BLOCK).toContain('background-image:');
  });

  it('builds the grain from brand tokens and no hardcoded colors', () => {
    expect(CLASS_BLOCK).toContain('var(--cach-sand-500)');
    expect(CLASS_BLOCK).toContain('var(--cach-brown-700)');
    expect(CLASS_BLOCK).toContain('var(--cach-sand-200)');
    expect(CLASS_BLOCK).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('never intercepts pointer events or loads external assets', () => {
    expect(CLASS_BLOCK).toContain('pointer-events: none;');
    expect(CLASS_BLOCK).not.toMatch(/https?:\/\//);
    expect(CLASS_BLOCK).not.toMatch(/animation|transition/);
  });

  it('repeats the grain at fixed background sizes', () => {
    expect(CLASS_BLOCK).toContain('background-repeat: repeat;');
    expect(CLASS_BLOCK).toContain('background-size:');
  });
});
