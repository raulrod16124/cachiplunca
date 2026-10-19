import { primitives, semantic } from '@raulrod/tokens';
import { appTheme, cssVarName } from '../../../../presentation/styles';
import type { TokenKey } from '../../../../presentation/styles';

function collectStrings(value: unknown): readonly string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (value !== null && typeof value === 'object') {
    return Object.values(value).flatMap(collectStrings);
  }

  return [];
}

function extractVars(css: string): readonly string[] {
  return [...css.matchAll(/var\((--rr-[a-z0-9-]+)\)/g)].map((match) => match[1] as string);
}

const KNOWN_VARS = new Set<string>([
  ...Object.keys(primitives).map((key) => cssVarName(key as TokenKey)),
  ...Object.keys(semantic).map((key) => cssVarName(key as TokenKey)),
]);

describe('appTheme', () => {
  it('references tokens emitted by @raulrod/tokens', () => {
    const refs = collectStrings(appTheme).flatMap(extractVars);

    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(KNOWN_VARS.has(ref)).toBe(true);
    }
  });

  it('does not reference the legacy invalid token names', () => {
    const allVars = collectStrings(appTheme).flatMap(extractVars);

    expect(allVars).not.toContain('--rr-color-text-default');
    expect(allVars).not.toContain('--rr-color-accent-default');
    expect(allVars).not.toContain('--rr-font-size-200');
  });

  it('exposes a soft element border alias derived from the default border', () => {
    expect(appTheme.canvas.elementBorderSoft).toContain('var(--rr-color-border-default)');
    expect(appTheme.canvas.elementBorderSoft).toContain('color-mix');
  });

  it('exposes semantic roles through stable theme paths', () => {
    expect(appTheme.color.text.primary).toBe('var(--rr-color-text-primary)');
    expect(appTheme.color.link.text).toBe('var(--rr-color-link-text)');
    expect(appTheme.font.size.sm).toBe('var(--rr-font-size-sm)');
    expect(appTheme.space[2]).toBe('var(--rr-space-2)');
    expect(appTheme.radius.sm).toBe('var(--rr-radius-sm)');
  });
});
