import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Invitation } from '../../../../../../domain/invitation';
import { InvitationId, UserId, WorkspaceId } from '../../../../../../domain/shared';
import { PendingInvitationsPanel } from '../../../../../../presentation/features/invitations/components/pending-invitations-panel';

const WORKSPACE = WorkspaceId.create('ws-1');

function makeInvitation(): Invitation {
  return Invitation.create({
    id: InvitationId.create('inv-1'),
    workspaceId: WORKSPACE,
    email: 'invitee@example.com',
    role: 'editor',
    tokenHash: 'hash-1',
    invitedBy: UserId.create('owner-1'),
    expiresAt: new Date('2026-03-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

function renderPanel(
  overrides: Partial<Parameters<typeof PendingInvitationsPanel>[0]> = {},
): ReturnType<typeof render> {
  return render(
    <PendingInvitationsPanel
      status="ready"
      invitations={[makeInvitation()]}
      loadError={null}
      actionError={null}
      needsVerification={false}
      verificationSent={false}
      acceptingId={null}
      onAccept={jest.fn()}
      onRetry={jest.fn()}
      onSendVerification={jest.fn()}
      {...overrides}
    />,
  );
}

describe('PendingInvitationsPanel', () => {
  it('shows the invited workspace and role', () => {
    renderPanel();

    expect(screen.getByText(/A workspace/)).toBeInTheDocument();
    expect(screen.getByText(/editor/i)).toBeInTheDocument();
  });

  it('forwards the accept action for the selected invitation', async () => {
    const user = userEvent.setup();
    const onAccept = jest.fn();
    renderPanel({ onAccept });

    await user.click(screen.getByRole('button', { name: 'Accept invitation' }));

    expect(onAccept).toHaveBeenCalledWith(expect.objectContaining({ role: 'editor' }));
  });

  it('shows a loading state while idle or loading', () => {
    const { rerender } = renderPanel({ status: 'idle' });
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading pending invitations')).toBeInTheDocument();

    rerender(
      <PendingInvitationsPanel
        status="loading"
        invitations={[]}
        loadError={null}
        actionError={null}
        needsVerification={false}
        verificationSent={false}
        acceptingId={null}
        onAccept={jest.fn()}
        onRetry={jest.fn()}
        onSendVerification={jest.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows an empty state when there are no pending invitations', () => {
    renderPanel({ invitations: [] });

    expect(screen.getByText('No pending invitations.')).toBeInTheDocument();
  });

  it('shows the load error and forwards retry', async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();
    renderPanel({ status: 'error', loadError: 'The network connection was lost.', onRetry });

    expect(screen.getByRole('alert')).toHaveTextContent('The network connection was lost.');
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the verification action when the email is not verified', async () => {
    const user = userEvent.setup();
    const onSendVerification = jest.fn();
    renderPanel({ needsVerification: true, onSendVerification });

    await user.click(screen.getByRole('button', { name: 'Resend verification email' }));

    expect(onSendVerification).toHaveBeenCalledTimes(1);
  });
});
