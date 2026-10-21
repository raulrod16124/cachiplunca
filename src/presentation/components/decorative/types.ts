import type { BrandPrimitiveKey } from '../../styles/brand/brand-tokens';

/**
 * Decorative artwork is intentionally restricted to the warm brand range.
 * Functional feedback colors (success/error/info) must not be reused as
 * illustration accents.
 */
export const DECORATIVE_COLORS = [
  'orange-500',
  'mustard-500',
  'green-900',
  'olive-500',
  'brown-700',
  'sand-400',
] as const satisfies readonly BrandPrimitiveKey[];

export type DecorativeColor = (typeof DECORATIVE_COLORS)[number];

export type DecorativeSize = 'sm' | 'md' | 'lg';

export interface DecorativeProps {
  /** Brand primitive used to paint the artwork. */
  readonly color?: DecorativeColor;
  readonly size?: DecorativeSize;
  readonly className?: string;
}
