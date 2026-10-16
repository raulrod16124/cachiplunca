import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { ErrorBoundary } from '../../../../presentation/components/error-boundary';

function Bomb({ shouldThrow }: { readonly shouldThrow: boolean }): ReactNode {
  if (shouldThrow) {
    throw new Error('Render explosion');
  }
  return <div data-testid="safe">Safe content</div>;
}

function ToggleBomb(): ReactNode {
  const [explode, setExplode] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setExplode(true)}>
        Explode
      </button>
      <Bomb shouldThrow={explode} />
    </div>
  );
}

describe('ErrorBoundary', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Child</div>
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders the default fallback when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('calls onError when a child throws', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe('Render explosion');
  });

  it('recovers when the user presses Try again', async () => {
    render(
      <ErrorBoundary>
        <ToggleBomb />
      </ErrorBoundary>,
    );

    await userEvent.click(screen.getByRole('button', { name: /explode/i }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByTestId('safe')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('safe')).toBeInTheDocument();
  });

  it('renders a custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom fallback</div>}>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });
});
