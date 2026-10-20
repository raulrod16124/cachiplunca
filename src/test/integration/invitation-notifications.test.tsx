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
  it('shows a badge and notice for new invitations, dismisses locally and accepts', async () => {
    const harness = createAppHarness();
    const owner = await harness.register();
    const firstWorkspace = await harness.createOwnerWorkspace('Notify board');
    const secondWorkspace = await harness.createOwnerWorkspace('Accept board');

    const invitee = await harness.authPort.signUp({
      email: 'invitee@example.com',
      password: 'Secret123',
    });
    harness.authPort.setSession({ ...invitee, emailVerified: true });

    harness.render({ initialPath: '/workspaces' });
    expect(await screen.findByText('Cachiplunca')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Invitations' })).toBeInTheDocument();

    await invite(harness, owner.uid, firstWorkspace, 'invitee@example.com');

    const notice = await screen.findByRole('status', { name: 'New invitation' });
    expect(within(notice).getByText(/invited you as editor/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Invitations, 1 pending/i })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'New invitation' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Invitations' })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Pending invitations' }),
    ).toBeInTheDocument();

    await invite(harness, owner.uid, secondWorkspace, 'invitee@example.com');

    const secondNotice = await screen.findByRole('status', { name: 'New invitation' });
    await user.click(within(secondNotice).getByRole('button', { name: 'Accept invitation' }));

    expect(await screen.findByRole('application', { name: 'Canvas' })).toBeInTheDocument();
    await expect(
      harness.membershipRepository.findByUserAndWorkspace(
        UserId.create(invitee.uid),
        secondWorkspace.id,
      ),
    ).resolves.toMatchObject({ role: 'editor' });
  });

  it('does not show invitations addressed to another user', async () => {
    const harness = createAppHarness();
    const owner = await harness.register();
    const workspace = await harness.createOwnerWorkspace('Private board');

    const invitee = await harness.authPort.signUp({
      email: 'invitee@example.com',
      password: 'Secret123',
    });
    harness.authPort.setSession({ ...invitee, emailVerified: true });

    harness.render({ initialPath: '/workspaces' });
    expect(await screen.findByText('Cachiplunca')).toBeInTheDocument();

    await invite(harness, owner.uid, workspace, 'someone-else@example.com');

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'New invitation' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Invitations' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Pending invitations' }),
    ).not.toBeInTheDocument();
  });
});
