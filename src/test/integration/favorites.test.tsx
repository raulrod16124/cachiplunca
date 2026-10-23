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

  it('shows only favorite boards on the favorites route', async () => {
    const harness = createAppHarness();
    const userEventSetup = userEvent.setup();
    await harness.register();
    await harness.createOwnerWorkspace('Roadmap');
    await harness.createOwnerWorkspace('Research');
    harness.render({ initialPath: '/workspaces' });

    await screen.findByRole('heading', { level: 3, name: 'Roadmap' });
    await userEventSetup.click(screen.getByRole('button', { name: 'Add to favorites Roadmap' }));
    await screen.findByRole('button', { name: 'Remove from favorites Roadmap' });

    await userEventSetup.click(screen.getByRole('link', { name: 'Favorites' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Favorites' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Favorites' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { level: 3, name: 'Roadmap' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Research' })).not.toBeInTheDocument();

    await userEventSetup.click(screen.getByRole('button', { name: 'List view' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);

    await userEventSetup.type(screen.getByRole('searchbox', { name: 'Search boards' }), 'Road');
    expect(screen.getByRole('heading', { name: 'Roadmap' })).toBeInTheDocument();
    expect(screen.getByText('1 board')).toBeInTheDocument();
  });

  it('removes a favorite from the favorites route and offers a way back to boards', async () => {
    const harness = createAppHarness();
    const userEventSetup = userEvent.setup();
    await harness.register();
    await harness.createOwnerWorkspace('Roadmap');
    harness.render({ initialPath: '/workspaces' });

    await screen.findByRole('heading', { level: 3, name: 'Roadmap' });
    await userEventSetup.click(screen.getByRole('button', { name: 'Add to favorites Roadmap' }));
    await screen.findByRole('button', { name: 'Remove from favorites Roadmap' });
    await userEventSetup.click(screen.getByRole('link', { name: 'Favorites' }));

    await screen.findByRole('heading', { level: 1, name: 'Favorites' });
    await userEventSetup.click(
      screen.getByRole('button', { name: 'Remove from favorites Roadmap' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'No favorite boards yet' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Roadmap' })).not.toBeInTheDocument();

    await userEventSetup.click(screen.getByRole('button', { name: 'Browse boards' }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/workspaces');
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your boards' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Roadmap' })).toBeInTheDocument();
  });
});
