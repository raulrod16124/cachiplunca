import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { SessionProvider } from '../../app/providers/session-provider';
import { AppRoutes } from '../../app/routes/app-routes';
import {
  createCreateWorkspace,
  createLoginUser,
  createLogoutUser,
  createRegisterUser,
} from '../../application/commands';
import { createGetWorkspace, createListWorkspaces } from '../../application/queries';
import { createSessionStore } from '../../application/services';
import { FakeAuthPort } from '../fixtures/fake-auth-port';
import { FakeWorkspaceRepository } from '../fixtures/fake-workspace-repository';

const CREDENTIALS = { email: 'user@example.com', password: 'secret123' };

function LocationProbe(): ReactNode {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

async function renderAuthenticatedApp(initialPath = '/workspaces') {
  const authPort = new FakeAuthPort();
  await authPort.signUp(CREDENTIALS);

  const repository = new FakeWorkspaceRepository();
  const workspace = await repository.create({ name: 'Roadmap Q4' });

  const view = render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SessionProvider store={createSessionStore(authPort)}>
        <AppRoutes
          registerUser={createRegisterUser(authPort)}
          loginUser={createLoginUser(authPort)}
          logoutUser={createLogoutUser(authPort)}
          listWorkspaces={createListWorkspaces(repository)}
          createWorkspace={createCreateWorkspace(repository)}
          getWorkspace={createGetWorkspace(repository)}
        />
      </SessionProvider>
      <LocationProbe />
    </MemoryRouter>,
  );

  return { ...view, repository, workspace };
}

describe('workspace shell routes', () => {
  beforeAll(() => {
    if (!('setPointerCapture' in Element.prototype)) {
      Object.defineProperty(Element.prototype, 'setPointerCapture', {
        value: jest.fn(),
        configurable: true,
      });
      Object.defineProperty(Element.prototype, 'hasPointerCapture', {
        value: jest.fn().mockReturnValue(true),
        configurable: true,
      });
      Object.defineProperty(Element.prototype, 'releasePointerCapture', {
        value: jest.fn(),
        configurable: true,
      });
    }
  });

  it('navigates to the workspace shell when clicking Open on a workspace card', async () => {
    const { workspace } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Roadmap Q4' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Roadmap Q4' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('application', { name: 'Canvas' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(`/workspaces/${workspace.id.value}`);
  });

  it('deep-links to the workspace shell and loads the workspace', async () => {
    await renderAuthenticatedApp('/workspaces/ws-does-not-exist');

    expect(await screen.findByRole('heading', { name: 'Workspace not found' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to workspaces' }));

    expect(await screen.findByRole('heading', { name: 'Your workspaces' })).toBeInTheDocument();
  });
});
