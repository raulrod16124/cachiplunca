import { render } from '../../../setup/render-with-theme';

/**
 * `AppThemeProvider` mounts `GlobalStyles`, so rendering any subject exercises
 * the global user-preference rules.
 */
function collectInjectedStyles(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

describe('GlobalStyles', () => {
  it('promotes subtle tokens under prefers-contrast: more', () => {
    render(<span />);
    const styles = collectInjectedStyles();

    expect(styles).toContain('@media (prefers-contrast: more)');
    expect(styles).toContain('--rr-color-border-default: var(--rr-color-border-strong)');
    expect(styles).toContain('--rr-color-text-muted: var(--rr-color-text-primary)');
  });
});
