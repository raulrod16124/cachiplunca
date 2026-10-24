import { screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { BrandLogo } from '../../../../presentation/components/brand-logo';
import { setPublicBasePath } from '../../../../presentation/config/public-base';

function imageSources(container: HTMLElement): string[] {
  return [...container.querySelectorAll('img')].map((image) => image.getAttribute('src') ?? '');
}

describe('BrandLogo', () => {
  afterEach(() => setPublicBasePath('/'));

  it('exposes the brand name and renders both theme wordmarks', () => {
    const { container } = render(<BrandLogo />);

    expect(screen.getByRole('img', { name: 'Cachiplunca' })).toBeInTheDocument();
    expect(screen.getByText('Cachiplunca')).toBeInTheDocument();
    expect(imageSources(container)).toEqual([
      '/brand/light_theme_logo_cachiplunca.png',
      '/brand/dark_theme_logo_cachiplunca.png',
    ]);
  });

  it('accepts a custom accessible label', () => {
    render(<BrandLogo label="Cachiplunca home" />);

    expect(screen.getByRole('img', { name: 'Cachiplunca home' })).toBeInTheDocument();
  });

  it('renders a single wordmark when the tone is forced', () => {
    const { container } = render(<BrandLogo tone="dark" />);

    expect(imageSources(container)).toEqual(['/brand/dark_theme_logo_cachiplunca.png']);
  });

  it('renders the reduced mark for compact and isotype variants', () => {
    const compact = render(<BrandLogo variant="compact" />);
    expect(imageSources(compact.container)).toEqual([
      '/brand/light_theme_logo_reducido_cachiplunca.png',
      '/brand/dark_theme_logo_reducido_cachiplunca.png',
    ]);

    const isotipo = render(<BrandLogo variant="isotipo" size="lg" />);
    expect(imageSources(isotipo.container)).toEqual([
      '/brand/light_theme_logo_reducido_cachiplunca.png',
      '/brand/dark_theme_logo_reducido_cachiplunca.png',
    ]);
    expect(isotipo.container.querySelector('img')).toHaveStyle({
      width: '48px',
      height: '48px',
    });
  });

  it('renders the wordmark and reduced mark in responsive mode', () => {
    const { container } = render(<BrandLogo variant="wordmark" responsive />);

    expect(imageSources(container)).toEqual([
      '/brand/light_theme_logo_cachiplunca.png',
      '/brand/dark_theme_logo_cachiplunca.png',
      '/brand/light_theme_logo_reducido_cachiplunca.png',
      '/brand/dark_theme_logo_reducido_cachiplunca.png',
    ]);
  });

  it('resolves brand assets through the configured public base path', () => {
    setPublicBasePath('/cachiplunca/');
    const { container } = render(<BrandLogo tone="light" />);

    expect(imageSources(container)).toEqual([
      '/cachiplunca/brand/light_theme_logo_cachiplunca.png',
    ]);
  });
});
