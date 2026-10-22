import { screen } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { LoadingState } from '../../../../presentation/components/loading-state';

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

describe('LoadingState', () => {
  it('renders with default message and status role', () => {
    render(<LoadingState />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<LoadingState message="Restoring data..." />);
    expect(screen.getByText('Restoring data...')).toBeInTheDocument();
  });

  it('renders without message when empty string', () => {
    render(<LoadingState message="" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('marks the status as busy', () => {
    render(<LoadingState />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders a visually hidden label for assistive technology', () => {
    render(<LoadingState label="Loading boards" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading boards');
  });

  it('renders custom indicator content instead of the default dots', () => {
    render(
      <LoadingState label="Loading items">
        <span data-testid="custom-indicator">content</span>
      </LoadingState>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByTestId('custom-indicator')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading items');
  });

  it('uses brand tokens for the indicator tone', () => {
    render(<LoadingState tone="brand" />);

    expect(styleText()).toContain('var(--rr-color-action-secondary-background)');
  });

  it('keeps the status container within the available width', () => {
    render(<LoadingState />);

    const css = styleText();
    expect(css).toContain('min-width:0');
    expect(css).toContain('max-width:100%');
  });
});
