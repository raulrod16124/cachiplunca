import { fireEvent, render, screen, within } from '@testing-library/react';
import { Invitation } from '../../../../../../domain/invitation';
import { InvitationId, UserId, WorkspaceId } from '../../../../../../domain/shared';
import { PendingInvitationsList } from '../../../../../../presentation/features/invitations/components/pending-invitations-list';

function buildInvitation(
  id: string,
  email: string,
  role: 'owner' | 'editor' | 'viewer',
): Invitation {
  return Invitation.create({
    id: InvitationId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    email,
    role,
    tokenHash: `hash-${id}`,
    invitedBy: UserId.create('user-1'),
    expiresAt: new Date('2026-02-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('PendingInvitationsList', () => {
  it('shows a loading state while fetching', () => {
    render(
      <PendingInvitationsList
        status="loading"
        invitations={[]}
        errorMessage={null}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading pending invitations')).toBeInTheDocument();
  });

  it('shows an error state and retries', () => {
    const onRetry = jest.fn();
    render(
      <PendingInvitationsList
        status="error"
        invitations={[]}
        errorMessage="Could not load invitations."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load invitations.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when there are no pending invitations', () => {
    render(
      <PendingInvitationsList
        status="ready"
        invitations={[]}
        errorMessage={null}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText('No pending invitations.')).toBeInTheDocument();
  });

  it('lists pending invitations with their role', () => {
    render(
      <PendingInvitationsList
        status="ready"
        invitations={[
          buildInvitation('inv-1', 'editor@example.com', 'editor'),
          buildInvitation('inv-2', 'viewer@example.com', 'viewer'),
        ]}
        errorMessage={null}
        onRetry={jest.fn()}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('editor@example.com')).toBeInTheDocument();
    expect(within(items[0]).getByText('editor')).toBeInTheDocument();
    expect(within(items[1]).getByText('viewer@example.com')).toBeInTheDocument();
  });
});
