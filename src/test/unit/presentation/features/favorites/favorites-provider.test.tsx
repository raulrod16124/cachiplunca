import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createToggleFavorite } from '../../../../../application/commands';
import { createListFavorites } from '../../../../../application/queries';
import type { FavoriteServices } from '../../../../../application/favorite-services';
import { createSessionStore } from '../../../../../application/services';
import { Favorite } from '../../../../../domain/favorite';
import { UserId, WorkspaceId } from '../../../../../domain/shared';
import { FavoritesProvider, useFavorites } from '../../../../../presentation/features/favorites';
import { SessionProvider } from '../../../../../presentation/providers/session-provider';
import { FakeAuthPort } from '../../../../fixtures/fake-auth-port';
import { FakeFavoriteRepository } from '../../../../fixtures/fake-favorite-repository';
import { FakeMembershipRepository } from '../../../../fixtures/fake-membership-repository';

const WORKSPACE = 'ws-1';

function Consumer(): ReactNode {
  const favorites = useFavorites();

  return (
    <div>
      <span data-testid="status">{favorites.status}</span>
      <span data-testid="favorite">{String(favorites.favoriteWorkspaceIds.has(WORKSPACE))}</span>
      <span data-testid="pending">{String(favorites.pendingWorkspaceIds.has(WORKSPACE))}</span>
      <span data-testid="action-error">{favorites.actionError ?? ''}</span>
      <button type="button" onClick={() => favorites.toggleFavorite(WORKSPACE)}>
        Toggle
      </button>
    </div>
  );
}

interface Setup {
  readonly authPort: FakeAuthPort;
  readonly userId: string;
  readonly favoriteRepository: FakeFavoriteRepository;
  readonly membershipRepository: FakeMembershipRepository;
  readonly services: FavoriteServices;
}

async function setup(options: { readonly favorite?: boolean } = {}): Promise<Setup> {
  const authPort = new FakeAuthPort();
  const user = await authPort.signUp({
    email: 'user@example.com',
    password: 'secret123',
    displayName: 'Test User',
  });
  const favoriteRepository = new FakeFavoriteRepository();
  const membershipRepository = new FakeMembershipRepository();
  const userId = UserId.create(user.uid);
  const workspaceId = WorkspaceId.create(WORKSPACE);

  await membershipRepository.create({ userId, workspaceId, role: 'owner' });
  if (options.favorite === true) {
    await favoriteRepository.add(Favorite.create({ userId, workspaceId }));
  }

  return {
    authPort,
    userId: user.uid,
    favoriteRepository,
    membershipRepository,
    services: {
      listFavorites: createListFavorites(favoriteRepository),
      toggleFavorite: createToggleFavorite({ favoriteRepository, membershipRepository }),
    },
  };
}

function renderProvider(authPort: FakeAuthPort, services?: FavoriteServices): void {
  render(
    <MemoryRouter>
      <SessionProvider store={createSessionStore(authPort)}>
        <Routes>
          <Route element={<FavoritesProvider services={services} />}>
            <Route path="*" element={<Consumer />} />
          </Route>
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('FavoritesProvider', () => {
  it('loads the favorite workspace ids for the session user', async () => {
    const { authPort, services } = await setup({ favorite: true });

    renderProvider(authPort, services);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });
    expect(screen.getByTestId('favorite')).toHaveTextContent('true');
  });

  it('adds a favorite optimistically and persists it', async () => {
    const { authPort, services, favoriteRepository } = await setup();
    const user = userEvent.setup();

    renderProvider(authPort, services);
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    await user.click(screen.getByRole('button', { name: 'Toggle' }));

    await waitFor(() => {
      expect(screen.getByTestId('favorite')).toHaveTextContent('true');
      expect(screen.getByTestId('pending')).toHaveTextContent('false');
    });
    expect(favoriteRepository.list()).toHaveLength(1);
  });

  it('rolls back the optimistic state when the toggle fails', async () => {
    const { authPort, services, favoriteRepository } = await setup({ favorite: true });
    jest.spyOn(favoriteRepository, 'remove').mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();

    renderProvider(authPort, services);
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    await user.click(screen.getByRole('button', { name: 'Toggle' }));

    await waitFor(() => {
      expect(screen.getByTestId('favorite')).toHaveTextContent('true');
      expect(screen.getByTestId('action-error')).not.toHaveTextContent('');
    });
    expect(screen.getByTestId('pending')).toHaveTextContent('false');
  });

  it('stays idle without services', async () => {
    const { authPort } = await setup();

    renderProvider(authPort);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('idle');
    });
  });
});
