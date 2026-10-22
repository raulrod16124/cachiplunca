import { screen, within } from '@testing-library/react';
import { render } from '../../../../setup/render-with-theme';
import { AuthLayout } from '../../../../../presentation/features/auth/auth-layout';

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

describe('AuthLayout', () => {
  it('renders the brand lockup, display tagline and value points around the form', () => {
    const { container } = render(
      <AuthLayout>
        <p>Auth form</p>
      </AuthLayout>,
    );

    const main = within(container).getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('img', { name: 'Cachiplunca' })).toBeInTheDocument();
    expect(screen.getByText('From scattered ideas to shared plans.')).toBeInTheDocument();
    expect(screen.getByText('An infinite canvas for your team')).toBeInTheDocument();
    expect(screen.getByText('Collaborate in real time, no setup')).toBeInTheDocument();
    expect(screen.getByText('Turn notes into an actionable plan')).toBeInTheDocument();
    expect(screen.getByText('Auth form')).toBeInTheDocument();
  });

  it('adds inert paper texture and decorative artwork', () => {
    const { container } = render(
      <AuthLayout>
        <p>Auth form</p>
      </AuthLayout>,
    );

    expect(container.querySelector('.cach-paper-texture')).not.toBeNull();
    expect(container.querySelectorAll('svg[focusable="false"]')).toHaveLength(2);
  });

  it('keeps the brand panel on fixed green surfaces in every theme', () => {
    render(
      <AuthLayout>
        <p>Auth form</p>
      </AuthLayout>,
    );

    const styles = styleText();
    expect(styles).toContain('var(--cach-green-900)');
    expect(styles).toContain('var(--cach-green-950)');
    expect(styles).toContain('var(--cach-cream-0)');
    expect(styles).toContain('var(--cach-mustard-500)');
    expect(styles).toContain('var(--cach-surface-page-pattern)');
    expect(styles).not.toContain('var(--rr-color-action-primary-background)');
    expect(styles).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('uses the display font only for the brand tagline', () => {
    render(
      <AuthLayout>
        <p>Auth form</p>
      </AuthLayout>,
    );

    const tagline = screen.getByText('From scattered ideas to shared plans.');
    const css = styleText();

    expect(css).toContain('var(--cach-font-display)');
    expect(tagline).toBeInTheDocument();
  });
});
