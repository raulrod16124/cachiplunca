import { screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { Spinner } from '../../../../presentation/components/spinner';

describe('Spinner', () => {
  it('renders with default label and status role', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<Spinner label="Saving" />);
    expect(screen.getByLabelText('Saving')).toBeInTheDocument();
  });

  it('renders different sizes', () => {
    const { rerender } = render(<Spinner size="sm" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(<Spinner size="md" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('disables the animation under prefers-reduced-motion: reduce', () => {
    render(<Spinner />);
    const styles = [...document.head.querySelectorAll('style')]
      .map((style) => style.textContent ?? '')
      .join('');

    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).toContain('animation-name:var(--rr-motion-behavior-reduced)');
  });
});
