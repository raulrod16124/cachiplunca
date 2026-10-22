import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SessionProvider } from '../../presentation/providers/session-provider';
import { AppRoutes } from '../../app/routes/app-routes';
import { createSessionStore } from '../../application/services';
import { UserId } from '../../domain/shared';
import { createAppHarness } from './harness';

describe('accept invitation route', () => {
  it('completes the invitation flow under StrictMode double effects', async () => {
    const harness = createAppHarness();
    const owner = await harness.register();
    const workspace = await harness.createOwnerWorkspace('Invite board');

    const invite = await harness.services.inviteMember!({
      workspaceId: workspace.id,
      email: 'invited@example.com',
      role: 'viewer',
      invitedBy: UserId.create(owner.uid),
    });
    if (invite.status !== 'ok') {
      throw new Error(`Expected invitation to be created, got ${invite.status}`);
    }

    harness.authPort.setSession({
      uid: 'invited-user',
      email: 'invited@example.com',
      emailVerified: true,
      displayName: null,
    });

    render(
      <StrictMode>
        <MemoryRouter initialEntries={[`/invitations/${invite.token}`]}>
          <SessionProvider store={createSessionStore(harness.authPort)}>
            <AppRoutes {...harness.services} />
          </SessionProvider>
        </MemoryRouter>
      </StrictMode>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Invitation accepted' }),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/as viewer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to board' })).toBeInTheDocument();
  });

  it('lets an invitee accept from the workspaces list without the invitation link', async () => {
    const harness = createAppHarness();
    const owner = await harness.register();
    const workspace = await harness.createOwnerWorkspace('Invite board');

    const invite = await harness.services.inviteMember!({
      workspaceId: workspace.id,
      email: 'invited@example.com',
      role: 'editor',
      invitedBy: UserId.create(owner.uid),
    });
    if (invite.status !== 'ok') {
      throw new Error(`Expected invitation to be created, got ${invite.status}`);
    }

    const invitee = await harness.authPort.signUp({
      email: 'invited@example.com',
      password: 'Secret123',
      displayName: 'Invitee',
    });
    harness.authPort.setSession({ ...invitee, emailVerified: true });

    harness.render({ initialPath: '/workspaces' });

    const notifications = await screen.findByRole('button', {
      name: 'Notifications, 1 pending',
    });
    fireEvent.click(notifications);

    const dialog = await screen.findByRole('dialog', { name: 'Invitations' });
    expect(within(dialog).getByText(/A board/)).toBeInTheDocument();
    expect(within(dialog).getByText(/editor/i)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Accept invitation' }));

    expect(await screen.findByRole('application', { name: 'Canvas' })).toBeInTheDocument();
    await expect(
      harness.membershipRepository.findByUserAndWorkspace(UserId.create(invitee.uid), workspace.id),
    ).resolves.toMatchObject({ role: 'editor' });
    await expect(
      harness.invitationRepository.findById(invite.invitation.id),
    ).resolves.toMatchObject({ status: 'accepted' });
  });
});
