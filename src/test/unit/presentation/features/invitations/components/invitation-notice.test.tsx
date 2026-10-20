import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Invitation } from '../../../../../../domain/invitation';
import { InvitationId, UserId, WorkspaceId } from '../../../../../../domain/shared';
import { InvitationNotice } from '../../../../../../presentation/features/invitations/components/invitation-notice';

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

describe('InvitationNotice', () => {
  it('announces the new invitation and forwards the actions', async () => {
    const user = userEvent.setup();
    const onAccept = jest.fn();
    const onDismiss = jest.fn();
    render(
      <InvitationNotice
        invitation={INVITATION}
        accepting={false}
        onAccept={onAccept}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByRole('status', { name: 'New invitation' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New invitation' })).toBeInTheDocument();
    expect(screen.getByText(/invited you as editor/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Accept invitation' }));
    expect(onAccept).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('disables the accept action while accepting', () => {
    render(
      <InvitationNotice
        invitation={INVITATION}
        accepting
        onAccept={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Accept invitation' })).toBeDisabled();
  });
});
