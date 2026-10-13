import { cssVarName, token } from '../../../../presentation/styles';

describe('token helpers', () => {
  it('maps dotted semantic keys to --rr-* custom properties', () => {
    expect(cssVarName('color.text.primary')).toBe('--rr-color-text-primary');
    expect(cssVarName('color.action.primary.background.hover')).toBe(
      '--rr-color-action-primary-background-hover',
    );
  });

  it('preserves kebab-case primitive keys', () => {
    expect(cssVarName('space-2')).toBe('--rr-space-2');
    expect(cssVarName('radius-md')).toBe('--rr-radius-md');
  });

  it('wraps the custom property in var()', () => {
    expect(token('color.focus.ring')).toBe('var(--rr-color-focus-ring)');
    expect(token('shadow.sm')).toBe('var(--rr-shadow-sm)');
  });
});
