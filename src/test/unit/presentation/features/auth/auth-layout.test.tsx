import { screen, within } from '@testing-library/react';
import { render } from '../../../../setup/render-with-theme';
import { AuthLayout } from '../../../../../presentation/features/auth/auth-layout';

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

describe('AuthLayout', () => {
  it('renders the brand lockup, pitch and value points around the form', () => {
    const { container } = render(
      <AuthLayout>
        <p>Auth form</p>
      </AuthLayout>,
    );

    const main = within(container).getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(main).toHaveAttribute('data-surface', 'stitch');
    expect(screen.getByRole('img', { name: 'Cachiplunca' })).toBeInTheDocument();
    expect(screen.getByText(/From scattered ideas/)).toBeInTheDocument();
    expect(screen.getByText('to shared plans.')).toBeInTheDocument();
    expect(screen.getByText('An infinite canvas for your team')).toBeInTheDocument();
    expect(screen.getByText('Collaborate in real time, no setup')).toBeInTheDocument();
    expect(screen.getByText('Turn notes into an actionable plan')).toBeInTheDocument();
    expect(screen.getByText('Auth form')).toBeInTheDocument();
  });

  it('adds inert Stitch texture and decorative artwork', () => {
    const { container } = render(
      <AuthLayout>
        <p>Auth form</p>
      </AuthLayout>,
    );

    expect(container.querySelector('[data-auth-decoration="hatch"]')).not.toBeNull();
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('uses the Stitch surface with a fixed dark-green brand panel', () => {
    render(
      <AuthLayout>
        <p>Auth form</p>
      </AuthLayout>,
    );

    const styles = styleText();
    expect(styles).toContain('var(--stitch-bg)');
    expect(styles).toContain('var(--stitch-card-shadow)');
    expect(styles).toContain('var(--stitch-nav-active-bg)');
    expect(styles).toContain('var(--cach-green-900)');
    expect(styles).toContain('var(--cach-green-980)');
    expect(styles).toContain('var(--cach-cream-0)');
    expect(styles).toContain('var(--cach-mustard-500)');
    expect(styles).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('uses Stitch typography for the brand pitch', () => {
    render(
      <AuthLayout>
        <p>Auth form</p>
      </AuthLayout>,
    );

    const css = styleText();
    expect(css).toContain('var(--stitch-font-body)');
    expect(css).toContain('font-style:italic');
    expect(css).toContain('text-transform:uppercase');
  });

  it('renders the global copyright below the auth card', () => {
    render(
      <AuthLayout>
        <p>Auth form</p>
      </AuthLayout>,
    );

    expect(screen.getByText('© 2026 Cachiplunca. All rights reserved.')).toBeInTheDocument();
  });
});
