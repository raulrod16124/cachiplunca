import { screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { Panel } from '../../../../presentation/components/panel';

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

describe('Panel', () => {
  it('renders a section with tokenized defaults', () => {
    const { container } = render(<Panel aria-label="Task plan" />);

    expect(container.querySelector('section')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Task plan' })).toBeInTheDocument();

    const css = styleText();
    expect(css).toContain('var(--rr-color-background-surface)');
    expect(css).toContain('var(--rr-radius-lg)');
    expect(css).toContain('var(--rr-space-4)');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('supports semantic elements and keeps accessible names', () => {
    render(<Panel as="aside" aria-label="Comments" />);

    expect(screen.getByRole('complementary', { name: 'Comments' })).toBeInTheDocument();
  });

  it('maps variants and padding to tokens', () => {
    render(<Panel variant="sunken" padding="lg" />);

    const css = styleText();
    expect(css).toContain('var(--rr-color-background-sunken)');
    expect(css).toContain('var(--rr-space-6)');
  });

  it('takes the full width and keeps it at narrow viewports', () => {
    render(<Panel aria-label="Responsive panel" />);

    const css = styleText();
    expect(css).toContain('width:100%');
    expect(css).toContain('@media (max-width: 700px)');
  });
});
