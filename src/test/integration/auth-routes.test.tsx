import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import {
  createLoginUser,
  createLogoutUser,
  createRegisterUser,
  type CreateWorkspaceWithOwner,
} from '../../application/commands';
import { createGetWorkspace } from '../../application/queries';
import type { AuthPort } from '../../application/ports';
import { createRealtimeSubscriptionManager } from '../../application/services';
import { ElementId } from '../../domain/shared';
import { FakeAuthPort } from '../fixtures/fake-auth-port';
import { FakeRealtimePort } from '../fixtures/fake-realtime-port';
import { PendingAuthPort } from '../fixtures/pending-auth-port';
import { renderAppRoutes } from './harness';

const CREDENTIALS = { email: 'user@example.com', password: 'secret123', displayName: 'Test User' };

function renderApp(
  authPort: AuthPort,
  initialPath: string,
  createWorkspaceWithOwner: CreateWorkspaceWithOwner = jest.fn(),
): ReturnType<typeof renderAppRoutes> {
  return renderAppRoutes({
    authPort,
    initialPath,
    props: {
      registerUser: createRegisterUser(authPort),
      loginUser: createLoginUser(authPort),
      logoutUser: createLogoutUser(authPort),
      listWorkspaces: jest.fn().mockResolvedValue({
        status: 'ok' as const,
        workspaces: [],
        rolesByWorkspaceId: new Map(),
      }),
      createWorkspaceWithOwner,
      getWorkspace: createGetWorkspace({
        async list() {
          return [];
        },
        async findById() {
          return null;
        },
        async create() {
          throw new Error('Not implemented');
        },
        async update() {
          throw new Error('Not implemented');
        },
        async touchActivity() {
          throw new Error('Not implemented');
        },
        async delete() {
          throw new Error('Not implemented');
        },
      }),
      loadWorkspaceElements: jest.fn().mockResolvedValue({ status: 'ok' as const, elements: [] }),
      elementPersistenceOrchestrator: {
        persistDelta: jest.fn().mockResolvedValue({ status: 'ok' as const }),
      },
      realtimeSubscriptionManager: createRealtimeSubscriptionManager(new FakeRealtimePort()),
      generateElementId: () => ElementId.create('generated'),
      favorites: {
        listFavorites: jest.fn().mockResolvedValue({ status: 'ok' as const, favorites: [] }),
        toggleFavorite: jest.fn().mockResolvedValue({ status: 'ok' as const, favorited: true }),
      },
    },
  });
}

function fillForm(): void {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: CREDENTIALS.email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: CREDENTIALS.password } });
}

function fillRegistrationForm(): void {
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: CREDENTIALS.displayName },
  });
  fillForm();
}

async function registeredUser(authPort: FakeAuthPort): Promise<void> {
  await authPort.signUp(CREDENTIALS);
  await authPort.signOut();
}

describe('auth routes', () => {
  it('redirects an anonymous visitor deep-linking to /workspaces over to /login', async () => {
    renderApp(new FakeAuthPort(), '/workspaces');

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('does not redirect while the session is still restoring', async () => {
    const authPort = new PendingAuthPort();
    renderApp(authPort, '/workspaces');

    const status = screen.getAllByRole('status');
    expect(status).toHaveLength(1);
    expect(status[0]).toHaveTextContent('Restoring your session…');
    expect(status[0]).toHaveAttribute('aria-busy', 'true');
    expect(status[0]).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('img', { name: 'Cachiplunca' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/workspaces');
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();

    await act(async () => {
      authPort.emitSession(null);
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('shows the full-page loading screen on /login while the session restores', async () => {
    const authPort = new PendingAuthPort();
    renderApp(authPort, '/login');

    expect(screen.getByRole('status')).toHaveTextContent('Restoring your session…');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.queryByRole('heading', { level: 1, name: 'Sign in' })).not.toBeInTheDocument();

    await act(async () => {
      authPort.emitSession(null);
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByTestId('full-page-loading')).not.toBeInTheDocument();
  });

  it('restores a persisted session straight into /workspaces', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);
    renderApp(authPort, '/');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your boards' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/workspaces');
  });

  it('opens /workspaces after signing in with valid credentials', async () => {
    const authPort = new FakeAuthPort();
    await registeredUser(authPort);
    renderApp(authPort, '/login');

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your boards' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/workspaces');
  });

  it('applies the remember me choice through the login command', async () => {
    const authPort = new FakeAuthPort();
    await registeredUser(authPort);
    renderApp(authPort, '/login');

    fillForm();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Remember me' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your boards' }),
    ).toBeInTheDocument();
    expect(authPort.sessionPersistence).toBe('session');
  });

  it('opens /workspaces after registering', async () => {
    renderApp(new FakeAuthPort(), '/register');

    fillRegistrationForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your boards' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/workspaces');
  });

  it('bounces an authenticated session away from /login', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);
    renderApp(authPort, '/login');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your boards' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/workspaces');
  });

  it('returns to /login after signing out from /workspaces', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);
    const sessions: Array<unknown> = [];
    authPort.observeSession((user) => sessions.push(user));
    renderApp(authPort, '/workspaces');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your boards' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
    await waitFor(() => expect(sessions.at(-1)).toBeNull());
  });

  it('redirects an anonymous visitor from /profile to /login', async () => {
    renderApp(new FakeAuthPort(), '/profile');

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('renders the profile page with its security tab from the query string', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);
    renderApp(authPort, '/profile?tab=security');

    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Security' })).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back to the profile tab for an unknown tab parameter', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);
    renderApp(authPort, '/profile?tab=unknown');

    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
  });

  it('removes the preferences tab from the profile page', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);
    renderApp(authPort, '/profile');

    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Security' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Preferences' })).not.toBeInTheDocument();
  });

  it('redirects the legacy preferences deep link to /settings', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);
    renderApp(authPort, '/profile?tab=preferences');

    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/settings');
    expect(screen.queryByRole('heading', { level: 1, name: 'Profile' })).not.toBeInTheDocument();
  });

  it('renders the settings page with its preference controls and active navigation', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);
    renderApp(authPort, '/settings');

    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/settings');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Font size' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Reduce motion' })).toBeInTheDocument();
  });

  it('redirects an anonymous visitor from /settings to /login', async () => {
    renderApp(new FakeAuthPort(), '/settings');

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('redirects an anonymous visitor from /favorites to /login', async () => {
    renderApp(new FakeAuthPort(), '/favorites');

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('renders the favorites page with its empty state and active navigation', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);
    renderApp(authPort, '/favorites');

    expect(await screen.findByRole('heading', { level: 1, name: 'Favorites' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/favorites');
    expect(screen.getByRole('link', { name: 'Favorites' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Boards' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('heading', { name: 'No favorite boards yet' })).toBeInTheDocument();
  });

  it('keeps the selected profile tab in the query string', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);
    renderApp(authPort, '/profile');

    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Security' }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/profile?tab=security'),
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Profile' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/profile'));
  });

  it('toggles between the sign in and sign up pages', async () => {
    renderApp(new FakeAuthPort(), '/login');

    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Create your account' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/register');

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('falls back to the sign up page for unknown routes', async () => {
    renderApp(new FakeAuthPort(), '/definitely-not-a-route');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Create your account' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/register');
  });

  it('opens the sign up page at the root path', async () => {
    renderApp(new FakeAuthPort(), '/');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Create your account' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/register');
  });
});
