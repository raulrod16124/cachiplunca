import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createAppHarness } from './harness';

describe('favorites integration', () => {
  it('marks a board as favorite and keeps it after a reload', async () => {
    const harness = createAppHarness();
    const userEventSetup = userEvent.setup();
    await harness.register();
    const workspace = await harness.createOwnerWorkspace('Roadmap');
    const firstRender = harness.render({ initialPath: '/workspaces' });

    await screen.findByRole('heading', { level: 3, name: 'Roadmap' });

    await userEventSetup.click(screen.getByRole('button', { name: 'Add to favorites Roadmap' }));

    await waitFor(() => {
      expect(harness.favoriteRepository.list()).toHaveLength(1);
    });
    expect(harness.favoriteRepository.list()[0]?.workspaceId.equals(workspace.id)).toBe(true);
    expect(
      await screen.findByRole('button', { name: 'Remove from favorites Roadmap' }),
    ).toHaveAttribute('aria-pressed', 'true');

    firstRender.unmount();
    harness.render({ initialPath: '/workspaces' });

    await screen.findByRole('heading', { level: 3, name: 'Roadmap' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remove from favorites Roadmap' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
  });

  it('removes a favorite from the card', async () => {
    const harness = createAppHarness();
    const userEventSetup = userEvent.setup();
    await harness.register();
    await harness.createOwnerWorkspace('Roadmap');
    harness.render({ initialPath: '/workspaces' });

    await screen.findByRole('heading', { level: 3, name: 'Roadmap' });
    await userEventSetup.click(screen.getByRole('button', { name: 'Add to favorites Roadmap' }));
    await screen.findByRole('button', { name: 'Remove from favorites Roadmap' });

    await userEventSetup.click(
      screen.getByRole('button', { name: 'Remove from favorites Roadmap' }),
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add to favorites Roadmap' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });
    expect(harness.favoriteRepository.list()).toHaveLength(0);
  });
});
