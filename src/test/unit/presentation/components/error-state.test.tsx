import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { ErrorState } from '../../../../presentation/components/error-state';

describe('ErrorState', () => {
  it('renders with default title and alert role', () => {
    render(<ErrorState />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders description and action', () => {
    const onAction = jest.fn();
    render(
      <ErrorState
        title="Network error"
        description="Please retry"
        actionLabel="Retry"
        onAction={onAction}
      />,
    );
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('Please retry')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders dismissible button', () => {
    const onDismiss = jest.fn();
    render(<ErrorState dismissible onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders a secondary action', () => {
    const onSecondaryAction = jest.fn();
    render(
      <ErrorState
        title="Could not load"
        actionLabel="Retry"
        onAction={jest.fn()}
        secondaryActionLabel="Go back"
        onSecondaryAction={onSecondaryAction}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(onSecondaryAction).toHaveBeenCalledTimes(1);
  });

  it('renders the title as a heading at the requested level', () => {
    render(<ErrorState title="Could not load workspace" titleAs="h1" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Could not load workspace' }),
    ).toBeInTheDocument();
  });
});
