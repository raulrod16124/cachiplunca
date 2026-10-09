import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { SessionProvider } from '../../app/providers/session-provider';
import { AppRoutes } from '../../app/routes/app-routes';
import {
  createLoginUser,
  createLogoutUser,
  createRegisterUser,
  type CreateWorkspace,
} from '../../application/commands';
import { createGetWorkspace } from '../../application/queries';
import type { AuthPort } from '../../application/ports';
import { createSessionStore } from '../../application/services';
import { FakeAuthPort } from '../fixtures/fake-auth-port';
import { PendingAuthPort } from '../fixtures/pending-auth-port';

const CREDENTIALS = { email: 'user@example.com', password: 'secret123' };

function LocationProbe(): ReactNode {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderApp(
  authPort: AuthPort,
  initialPath: string,
  createWorkspace: CreateWorkspace = jest.fn(),
): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SessionProvider store={createSessionStore(authPort)}>
        <AppRoutes
          registerUser={createRegisterUser(authPort)}
          loginUser={createLoginUser(authPort)}
          logoutUser={createLogoutUser(authPort)}
          listWorkspaces={jest.fn().mockResolvedValue({ status: 'ok' as const, workspaces: [] })}
          createWorkspace={createWorkspace}
          getWorkspace={createGetWorkspace({
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
            async delete() {
              throw new Error('Not implemented');
            },
          })}
        />
      </SessionProvider>
      <LocationProbe />
    </MemoryRouter>,
  );
}

function fillForm(): void {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: CREDENTIALS.email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: CREDENTIALS.password } });
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

    expect(screen.getByRole('status')).toHaveTextContent('Restoring your session…');
    expect(screen.getByTestId('location')).toHaveTextContent('/workspaces');
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();

    await act(async () => {
      authPort.emitSession(null);
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('restores a persisted session straight into /workspaces', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);
    renderApp(authPort, '/');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your workspaces' }),
    ).toBeInTheDocument();
    expect(screen.getByText(`${CREDENTIALS.email} is ready to plan.`)).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/workspaces');
  });

  it('opens /workspaces after signing in with valid credentials', async () => {
    const authPort = new FakeAuthPort();
    await registeredUser(authPort);
    renderApp(authPort, '/login');

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your workspaces' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/workspaces');
  });

  it('opens /workspaces after registering', async () => {
    renderApp(new FakeAuthPort(), '/register');

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your workspaces' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/workspaces');
  });

  it('bounces an authenticated session away from /login', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);
    renderApp(authPort, '/login');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your workspaces' }),
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
      await screen.findByRole('heading', { level: 1, name: 'Your workspaces' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
    await waitFor(() => expect(sessions.at(-1)).toBeNull());
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
