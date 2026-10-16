import type { ComponentToken, PrimitiveToken, SemanticToken } from '@raulrod/tokens';

export type TokenKey = PrimitiveToken | SemanticToken | ComponentToken;

/**
 * Maps a token key to the CSS custom property emitted by `@raulrod/tokens`.
 * Dots become hyphens: `color.text.primary` -> `--rr-color-text-primary`,
 * and kebab primitives are preserved: `space-2` -> `--rr-space-2`.
 */
export function cssVarName(key: TokenKey): string {
  return `--rr-${key.replaceAll('.', '-')}`;
}

/** Resolves a token key to a `var(--rr-*)` reference for use in styles. */
export function token(key: TokenKey): string {
  return `var(${cssVarName(key)})`;
}
