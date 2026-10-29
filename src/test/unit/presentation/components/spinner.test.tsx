import { screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { localeWrapper } from '../../../setup/locale-wrapper';
import { Spinner } from '../../../../presentation/components/spinner';
import { MESSAGES } from '../../../../presentation/i18n';

describe('Spinner', () => {
  it('renders with default label and status role', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText(MESSAGES.en['common.loading'])).toBeInTheDocument();
  });

  it('renders the default label in Spanish', () => {
    render(<Spinner />, { wrapper: localeWrapper('es') });
    expect(screen.getByLabelText(MESSAGES.es['common.loading'])).toBeInTheDocument();
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

  it('renders a decorative spinner without a status role', () => {
    render(<Spinner decorative />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByTestId('spinner')).toHaveAttribute('aria-hidden', 'true');
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
