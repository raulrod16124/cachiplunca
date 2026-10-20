import { screen } from '@testing-library/react';
import { createAppHarness } from './harness';

describe('guest workspace route', () => {
  it('opens a read-only board for an anonymous visitor and shows the revoked state after revocation', async () => {
    const harness = createAppHarness();
    const owner = await harness.register();
    const workspace = await harness.createOwnerWorkspace('Guest board');
    const created = await harness.services.guestLinks?.createGuestLink({
      workspaceId: workspace.id.value,
      actorUserId: owner.uid,
    });

    if (created === undefined || created.status !== 'ok') {
      throw new Error('Expected the guest link to be created');
    }

    await harness.authPort.signOut();
    const path = `/view/${created.token}`;
    const first = harness.render({ initialPath: path });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Guest board' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('application', { name: 'Canvas' })).toHaveAttribute(
      'aria-readonly',
      'true',
    );
    expect(screen.getByText('View only')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add text' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();

    await harness.services.guestLinks?.revokeGuestLink({
      workspaceId: workspace.id.value,
      actorUserId: owner.uid,
      tokenHash: created.link.tokenHash,
    });

    first.unmount();
    harness.render({ initialPath: path });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'This view link was revoked' }),
    ).toBeInTheDocument();
  });

  it('shows an invalid state for an unknown token without redirecting to login', async () => {
    const harness = createAppHarness();

    harness.render({ initialPath: '/view/unknown-token' });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'This view link is not valid' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
  });
});
