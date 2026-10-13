import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../../setup/render-with-theme';
import { EmptyState } from '../../../../presentation/components/empty-state';

describe('EmptyState', () => {
  it('renders with default title and status role', () => {
    render(<EmptyState />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
  });

  it('renders description and action', () => {
    const onAction = jest.fn();
    render(
      <EmptyState
        title="No invitations"
        description="Invite someone to get started"
        actionLabel="Invite"
        onAction={onAction}
      />,
    );
    expect(screen.getByText('No invitations')).toBeInTheDocument();
    expect(screen.getByText('Invite someone to get started')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders with icon', () => {
    render(<EmptyState icon={<span>📋</span>} />);
    expect(screen.getByText('📋')).toBeInTheDocument();
  });
});
