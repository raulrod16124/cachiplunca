import { screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { EmptyState } from '../../../../presentation/components/empty-state';
import {
  DecorativeArrow,
  DecorativeBlob,
  DecorativeSpark,
  DecorativeUnderline,
  PaperTexture,
} from '../../../../presentation/components/decorative';

const ARTWORKS = [
  { name: 'arrow', Component: DecorativeArrow },
  { name: 'underline', Component: DecorativeUnderline },
  { name: 'spark', Component: DecorativeSpark },
  { name: 'blob', Component: DecorativeBlob },
] as const;

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

describe('decorative primitives', () => {
  it.each(ARTWORKS)('renders $name as a hidden, non-interactive svg', ({ Component }) => {
    const { container } = render(<Component />);

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).toHaveStyle({ pointerEvents: 'none' });
  });

  it('defaults to a warm brand accent per artwork', () => {
    const arrow = render(<DecorativeArrow />);
    const spark = render(<DecorativeSpark />);
    const blob = render(<DecorativeBlob />);

    expect(arrow.container.querySelector('path')).toHaveAttribute(
      'stroke',
      'var(--cach-orange-500)',
    );
    expect(spark.container.querySelector('path')).toHaveAttribute(
      'fill',
      'var(--cach-mustard-500)',
    );
    expect(blob.container.querySelector('path')).toHaveAttribute('fill', 'var(--cach-olive-500)');
  });

  it('maps the color prop to a brand token instead of a hardcoded value', () => {
    const { container } = render(<DecorativeSpark color="mustard-500" />);

    expect(container.querySelector('path')).toHaveAttribute('fill', 'var(--cach-mustard-500)');
    expect(styleText()).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('maps size presets to fixed dimensions', () => {
    const { container } = render(<DecorativeArrow size="lg" />);

    expect(container.querySelector('svg')).toHaveStyle({ width: '64px', height: '32px' });
  });

  it('works inside the EmptyState icon slot without being announced', () => {
    render(<EmptyState title="No ideas yet" icon={<DecorativeSpark />} />);

    const status = screen.getByRole('status');
    expect(status.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('heading', { name: 'No ideas yet' })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('PaperTexture', () => {
  it('applies the reusable texture class and keeps custom classes', () => {
    const { container } = render(<PaperTexture className="auth-panel" />);

    const texture = container.querySelector('.cach-paper-texture');
    expect(texture).not.toBeNull();
    expect(texture).toHaveClass('cach-paper-texture', 'auth-panel');
    expect(texture).toHaveAttribute('aria-hidden', 'true');
    expect(texture).toHaveStyle({ pointerEvents: 'none', position: 'absolute' });
  });
});
