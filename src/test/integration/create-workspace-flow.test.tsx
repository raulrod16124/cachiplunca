import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SessionProvider } from '../../app/providers/session-provider';
import { AppRoutes } from '../../app/routes/app-routes';
import {
  createCreateWorkspace,
  createLoginUser,
  createLogoutUser,
  createRegisterUser,
} from '../../application/commands';
import { createGetWorkspace } from '../../application/queries';
import type {
  ListWorkspaces,
  ListWorkspacesResult,
} from '../../application/queries/list-workspaces';
import { createSessionStore } from '../../application/services';
import { FakeAuthPort } from '../fixtures/fake-auth-port';
import { FakeWorkspaceRepository } from '../fixtures/fake-workspace-repository';

const CREDENTIALS = { email: 'user@example.com', password: 'secret123' };

async function renderAuthenticatedApp() {
  const authPort = new FakeAuthPort();
  await authPort.signUp(CREDENTIALS);

  const repository = new FakeWorkspaceRepository();
  const listWorkspaces = jest.fn(async (): Promise<ListWorkspacesResult> => ({
    status: 'ok',
    workspaces: await repository.list(),
  }));
  const listWorkspacesQuery: ListWorkspaces = listWorkspaces;

  const view = render(
    <MemoryRouter initialEntries={['/workspaces']}>
      <SessionProvider store={createSessionStore(authPort)}>
        <AppRoutes
          registerUser={createRegisterUser(authPort)}
          loginUser={createLoginUser(authPort)}
          logoutUser={createLogoutUser(authPort)}
          listWorkspaces={listWorkspacesQuery}
          createWorkspace={createCreateWorkspace(repository)}
          getWorkspace={createGetWorkspace(repository)}
        />
      </SessionProvider>
    </MemoryRouter>,
  );

  return { ...view, repository, listWorkspaces };
}

function openCreateDialog(): void {
  const [trigger] = screen.getAllByRole('button', { name: 'Create workspace' });
  fireEvent.click(trigger);
}

describe('create workspace flow', () => {
  it('creates a workspace from the empty state and shows it in the list', async () => {
    const { listWorkspaces } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'No workspaces yet' })).toBeInTheDocument();
    expect(listWorkspaces).toHaveBeenCalledTimes(1);

    openCreateDialog();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Enter a workspace name.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Roadmap Q4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Roadmap Q4' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(listWorkspaces).toHaveBeenCalledTimes(2));
  });

  it('leaves the list untouched when the dialog is cancelled', async () => {
    const { repository, listWorkspaces } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'No workspaces yet' })).toBeInTheDocument();

    openCreateDialog();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Discarded draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(listWorkspaces).toHaveBeenCalledTimes(1);
    await expect(repository.list()).resolves.toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'No workspaces yet' })).toBeInTheDocument();
  });
});
