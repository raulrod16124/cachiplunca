/**
 * Brand primitives for the CACHIPLUNCA redesign.
 *
 * These values mirror the `--cach-*` custom properties declared in
 * `brand-theme.css`. Keep both files in sync: the unit test in
 * `src/test/unit/presentation/styles/brand-tokens.test.ts` guards drift.
 */
export const brandPrimitives = {
  'green-900': '#173e2c',
  'green-950': '#0f2f21',
  'green-980': '#0a2418',
  'olive-500': '#8b9676',
  'mustard-500': '#ffb400',
  'mustard-600': '#e6a200',
  'orange-500': '#ff7a2f',
  'orange-600': '#e85f12',
  white: '#ffffff',
  'neutral-100': '#f2f2ef',
  'board-green-100': '#d9e4ce',
  'cream-0': '#fffdf9',
  'cream-50': '#fbf6f1',
  'sand-200': '#eadfc8',
  'sand-400': '#c9a688',
  'sand-500': '#9c8a72',
  'sand-600': '#8a7659',
  'brown-700': '#885e3c',
  'graphite-900': '#202d2d',
  'muted-600': '#5f6558',
  'success-700': '#15803d',
  'error-700': '#b91c1c',
  'info-700': '#1d4ed8',
  'warning-500': '#f9c80e',
} as const;

export type BrandPrimitiveKey = keyof typeof brandPrimitives;

/** Resolves a typed brand primitive to its CSS custom property reference. */
export function brandVar(key: BrandPrimitiveKey): string {
  return `var(--cach-${key})`;
}

export const brandTypography = {
  'font-display': "'Bangers', 'Inter', 'Helvetica Neue', Arial, sans-serif",
} as const;

export type BrandTypographyKey = keyof typeof brandTypography;

export function brandFontVar(key: BrandTypographyKey): string {
  return `var(--cach-${key})`;
}
