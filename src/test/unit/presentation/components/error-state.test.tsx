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
});
