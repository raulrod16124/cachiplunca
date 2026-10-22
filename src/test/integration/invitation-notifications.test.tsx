import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserId } from '../../domain/shared';
import type { Workspace } from '../../domain/workspace';
import { createAppHarness } from './harness';

async function invite(
  harness: ReturnType<typeof createAppHarness>,
  ownerId: string,
  workspace: Workspace,
  email: string,
  role: 'editor' | 'viewer' = 'editor',
): Promise<void> {
  await act(async () => {
    const result = await harness.services.inviteMember!({
      workspaceId: workspace.id,
      email,
      role,
      invitedBy: UserId.create(ownerId),
    });
    if (result.status !== 'ok') {
      throw new Error(`Expected invitation to be created, got ${result.status}`);
    }
  });
}

describe('in-app invitation notifications', () => {
  it('shows a badge, dismisses the notice and accepts from the notifications dialog', async () => {
    const harness = createAppHarness();
    const owner = await harness.register();
    const workspace = await harness.createOwnerWorkspace('Notify board');

    const invitee = await harness.authPort.signUp({
      email: 'invitee@example.com',
      password: 'Secret123',
      displayName: 'Invitee',
    });
    harness.authPort.setSession({ ...invitee, emailVerified: true });

    harness.render({ initialPath: '/workspaces' });
    expect(await screen.findByText('Cachiplunca')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Invitations/i })).not.toBeInTheDocument();

    await invite(harness, owner.uid, workspace, 'invitee@example.com');

    const notice = await screen.findByRole('status', { name: 'New invitation' });
    expect(within(notice).getByText(/invited you as editor/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Notifications, 1 pending/i })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'New invitation' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Notifications, 1 pending/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Notifications, 1 pending/i }));

    const dialog = await screen.findByRole('dialog', { name: 'Invitations' });
    expect(within(dialog).getByText(/invited you as editor/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Accept invitation' }));

    expect(await screen.findByRole('application', { name: 'Canvas' })).toBeInTheDocument();
    await expect(
      harness.membershipRepository.findByUserAndWorkspace(UserId.create(invitee.uid), workspace.id),
    ).resolves.toMatchObject({ role: 'editor' });
  });

  it('does not show invitations addressed to another user', async () => {
    const harness = createAppHarness();
    const owner = await harness.register();
    const workspace = await harness.createOwnerWorkspace('Private board');

    const invitee = await harness.authPort.signUp({
      email: 'invitee@example.com',
      password: 'Secret123',
      displayName: 'Invitee',
    });
    harness.authPort.setSession({ ...invitee, emailVerified: true });

    harness.render({ initialPath: '/workspaces' });
    expect(await screen.findByText('Cachiplunca')).toBeInTheDocument();

    await invite(harness, owner.uid, workspace, 'someone-else@example.com');

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'New invitation' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Notifications' }));

    const dialog = await screen.findByRole('dialog', { name: 'Invitations' });
    expect(within(dialog).getByText('No pending invitations.')).toBeInTheDocument();
  });
});
