import {
  REDUCED_MOTION_BEHAVIOR,
  REDUCED_MOTION_QUERY,
} from '../../../../presentation/styles/preferences';

describe('motion preferences', () => {
  it('exposes the reduced-motion media query', () => {
    expect(REDUCED_MOTION_QUERY).toBe('@media (prefers-reduced-motion: reduce)');
  });

  it('points the reduced behaviour at the token emitted by @raulrod/tokens', () => {
    expect(REDUCED_MOTION_BEHAVIOR).toBe('var(--rr-motion-behavior-reduced)');
  });
});
