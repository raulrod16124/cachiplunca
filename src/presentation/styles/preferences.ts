import { css } from 'styled-components';
import { token } from './tokens';

/** OS/browser preference: reduce non-essential motion (`prefers-reduced-motion`). */
export const REDUCED_MOTION_QUERY = '@media (prefers-reduced-motion: reduce)';

/**
 * Value of the reduced-motion behaviour token. The token layer resolves it to
 * `none` when the user asks for reduced motion, and to the real animation name
 * otherwise. Mirrors the `@raulrod/ui` contract: setting `animation-name` to
 * this token disables the animation without changing any other property.
 */
export const REDUCED_MOTION_BEHAVIOR = token('motion.behavior.reduced');

/**
 * Disables a component animation under `prefers-reduced-motion: reduce`.
 * Spread it after the `animation` shorthand so only the name is overridden:
 *
 * ```ts
 * const Ring = styled.div`
 *   animation: ${spin} 0.8s linear infinite;
 *   ${respectReducedMotion}
 * `;
 * ```
 */
export const respectReducedMotion = css`
  ${REDUCED_MOTION_QUERY} {
    animation-name: ${REDUCED_MOTION_BEHAVIOR};
  }
`;
