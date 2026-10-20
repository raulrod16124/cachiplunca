import { screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { BrandLogo } from '../../../../presentation/components/brand-logo';

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

describe('BrandLogo', () => {
  it('exposes the brand name as the accessible name of the mark', () => {
    const { container } = render(<BrandLogo />);

    expect(screen.getByRole('img', { name: 'Cachiplunca' })).toBeInTheDocument();
    expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThan(0);
    expect(screen.getByText('Cachiplunca')).toBeInTheDocument();
  });

  it('accepts a custom accessible label', () => {
    render(<BrandLogo label="Cachiplunca home" />);

    expect(screen.getByRole('img', { name: 'Cachiplunca home' })).toBeInTheDocument();
  });

  it('renders the compact lockup as lettering without the decoration svg', () => {
    const { container } = render(<BrandLogo variant="compact" />);

    expect(screen.getByRole('img', { name: 'Cachiplunca' })).toBeInTheDocument();
    expect(screen.getByText('CACHIPLUNCA')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders the isotipo as a hidden decorative svg sized by the size prop', () => {
    const { container } = render(<BrandLogo variant="isotipo" size="lg" />);

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('viewBox', '0 0 64 64');
    expect(svg).toHaveStyle({ width: '40px', height: '40px' });
  });

  it('renders both lockups in responsive mode so CSS can swap them', () => {
    const { container } = render(<BrandLogo variant="wordmark" responsive />);

    const lockups = screen.getAllByText('CACHIPLUNCA');
    expect(lockups).toHaveLength(2);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('paints brand tokens only, never hardcoded hex colors', () => {
    render(<BrandLogo />);

    const styles = styleText();
    expect(styles).toContain('var(--cach-orange-500)');
    expect(styles).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('uses the display font token for the lettering', () => {
    render(<BrandLogo />);

    expect(styleText()).toContain('var(--cach-font-display)');
  });
});
