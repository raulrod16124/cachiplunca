import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { Invitation } from '../../../../../../domain/invitation';
import { InvitationId, UserId, WorkspaceId } from '../../../../../../domain/shared';
import { InvitationsDialog } from '../../../../../../presentation/features/invitations/components/invitations-dialog';

const INVITATION = Invitation.create({
  id: InvitationId.create('inv-1'),
  workspaceId: WorkspaceId.create('ws-1'),
  email: 'invitee@example.com',
  role: 'editor',
  tokenHash: 'hash-1',
  invitedBy: UserId.create('owner-1'),
  expiresAt: new Date('2026-03-01T00:00:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

function StatefulDialog({
  overrides,
}: {
  readonly overrides: Partial<Parameters<typeof InvitationsDialog>[0]>;
}): ReactNode {
  const [open, setOpen] = useState(false);

  return (
    <InvitationsDialog
      open={open}
      onOpenChange={setOpen}
      status="ready"
      invitations={[]}
      loadError={null}
      actionError={null}
      needsVerification={false}
      verificationSent={false}
      acceptingId={null}
      onAccept={jest.fn()}
      onRetry={jest.fn()}
      onSendVerification={jest.fn()}
      {...overrides}
    />
  );
}

function renderDialog(
  overrides: Partial<Parameters<typeof InvitationsDialog>[0]> = {},
): ReturnType<typeof render> {
  return render(<StatefulDialog overrides={overrides} />);
}

describe('InvitationsDialog', () => {
  it('shows a plain notifications trigger when there are no pending invitations', () => {
    renderDialog();

    const trigger = screen.getByRole('button', { name: 'Notifications' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).not.toHaveTextContent('1');
  });

  it('shows the pending count in the accessible name and badge', () => {
    renderDialog({ invitations: [INVITATION] });

    const trigger = screen.getByRole('button', { name: 'Notifications, 1 pending' });
    expect(within(trigger).getByText('1')).toBeInTheDocument();
  });

  it('opens the dialog with an explicit empty state', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Notifications' }));

    const dialog = await screen.findByRole('dialog', { name: 'Invitations' });
    expect(within(dialog).getByText('No pending invitations.')).toBeInTheDocument();
  });

  it('lists pending invitations and forwards the accept action', async () => {
    const user = userEvent.setup();
    const onAccept = jest.fn();
    renderDialog({ invitations: [INVITATION], onAccept });

    await user.click(screen.getByRole('button', { name: 'Notifications, 1 pending' }));

    const dialog = await screen.findByRole('dialog', { name: 'Invitations' });
    await user.click(within(dialog).getByRole('button', { name: 'Accept invitation' }));

    expect(onAccept).toHaveBeenCalledWith(expect.objectContaining({ role: 'editor' }));
  });

  it('closes with Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderDialog();

    const trigger = screen.getByRole('button', { name: 'Notifications' });
    await user.click(trigger);
    expect(await screen.findByRole('dialog', { name: 'Invitations' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Invitations' })).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });
});
