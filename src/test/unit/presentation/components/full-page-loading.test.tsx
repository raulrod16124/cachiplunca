import { screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { localeWrapper } from '../../../setup/locale-wrapper';
import { FullPageLoading } from '../../../../presentation/components/full-page-loading';
import { MESSAGES } from '../../../../presentation/i18n';

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

describe('FullPageLoading', () => {
  it('renders a single polite busy status region', () => {
    render(<FullPageLoading />);

    const status = screen.getAllByRole('status');
    expect(status).toHaveLength(1);
    expect(status[0]).toHaveAttribute('aria-live', 'polite');
    expect(status[0]).toHaveAttribute('aria-busy', 'true');
  });

  it('renders the brand logo and the default message in English', () => {
    render(<FullPageLoading />);

    expect(screen.getByRole('img', { name: MESSAGES.en['brand.name'] })).toBeInTheDocument();
    expect(screen.getByText(MESSAGES.en['loadingScreen.default'])).toBeInTheDocument();
  });

  it('renders the default message in Spanish', () => {
    render(<FullPageLoading />, { wrapper: localeWrapper('es') });

    expect(screen.getByText(MESSAGES.es['loadingScreen.default'])).toBeInTheDocument();
  });

  it('renders a context message key in both locales', () => {
    const { unmount } = render(<FullPageLoading messageKey="session.restoring" />);
    expect(screen.getByText(MESSAGES.en['session.restoring'])).toBeInTheDocument();
    unmount();

    render(<FullPageLoading messageKey="session.restoring" />, {
      wrapper: localeWrapper('es'),
    });
    expect(screen.getByText(MESSAGES.es['session.restoring'])).toBeInTheDocument();
  });

  it('renders a custom message override instead of the default', () => {
    render(<FullPageLoading message="Opening board…" />);

    expect(screen.getByText('Opening board…')).toBeInTheDocument();
    expect(screen.queryByText(MESSAGES.en['loadingScreen.default'])).not.toBeInTheDocument();
  });

  it('renders a visually hidden label when provided', () => {
    render(<FullPageLoading label="Loading board" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading board');
  });

  it('renders the page variant as the main landmark with a focusable target', () => {
    render(<FullPageLoading />);

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveAttribute('tabindex', '-1');
  });

  it('does not duplicate the main landmark in the section variant', () => {
    render(<FullPageLoading variant="section" />);

    expect(screen.queryByRole('main')).not.toBeInTheDocument();
    expect(document.getElementById('main-content')).toBeNull();
  });

  it('renders children inside the single status region', () => {
    render(
      <FullPageLoading variant="section">
        <span data-testid="skeleton">skeleton</span>
      </FullPageLoading>,
    );

    const status = screen.getByRole('status');
    expect(status).toContainElement(screen.getByTestId('skeleton'));
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('disables the spinner rotation under prefers-reduced-motion', () => {
    render(<FullPageLoading />);

    const styles = styleText();
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).toContain('animation-name:var(--rr-motion-behavior-reduced)');
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('keeps the logo dimensions fixed to avoid layout shift', () => {
    render(<FullPageLoading />);

    const images = [...document.querySelectorAll('img')];
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image.getAttribute('width')).not.toBeNull();
      expect(image.getAttribute('height')).not.toBeNull();
    }
  });
});
