import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { WorkspacesListContainer } from '../../../../../../presentation/features/workspaces/components/workspaces-list-container';
import type {
  ListWorkspaces,
  ListWorkspacesResult,
} from '../../../../../../application/queries/list-workspaces';
import type {
  DeleteWorkspace,
  DuplicateWorkspace,
  UpdateWorkspace,
} from '../../../../../../application/commands';
import { Workspace } from '../../../../../../domain/workspace';
import { UserId, WorkspaceId } from '../../../../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../../../../shared/errors';

const CREATED_BY = UserId.create('user-1');

function createWorkspace(name: string): Workspace {
  return Workspace.create({
    id: WorkspaceId.create(`ws-${name}`),
    name,
    createdBy: CREATED_BY,
  });
}

function renderWithRouter(children: ReactNode): ReturnType<typeof render> {
  return render(<MemoryRouter>{children}</MemoryRouter>);
}

function LocationProbe(): ReactNode {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

describe('WorkspacesListContainer', () => {
  const onCreate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('transitions from loading to success and renders workspaces', async () => {
    const workspaces = [createWorkspace('Alpha')];
    const result: ListWorkspacesResult = {
      status: 'ok',
      workspaces,
      rolesByWorkspaceId: new Map([[workspaces[0].id.value, 'owner']]),
    };
    const listWorkspaces: ListWorkspaces = jest.fn().mockResolvedValue(result);

    renderWithRouter(
      <WorkspacesListContainer
        userId="user-1"
        listWorkspaces={listWorkspaces}
        onCreateWorkspace={onCreate}
      />,
    );

    expect(screen.getAllByTestId(/skeleton/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    });

    expect(listWorkspaces).toHaveBeenCalledTimes(1);
  });

  it('transitions from loading to error and shows retry', async () => {
    const error = createAppError('unknown', ERROR_CODES.UNKNOWN_UNEXPECTED, 'Network failed');
    const result: ListWorkspacesResult = { status: 'error', error };
    const listWorkspaces: ListWorkspaces = jest.fn().mockResolvedValue(result);
    const user = userEvent.setup();

    renderWithRouter(
      <WorkspacesListContainer
        userId="user-1"
        listWorkspaces={listWorkspaces}
        onCreateWorkspace={onCreate}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText('We could not load your boards. Please try again.'),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(listWorkspaces).toHaveBeenCalledTimes(2);
  });

  it('shows empty state when no workspaces', async () => {
    const result: ListWorkspacesResult = {
      status: 'ok',
      workspaces: [],
      rolesByWorkspaceId: new Map(),
    };
    const listWorkspaces: ListWorkspaces = jest.fn().mockResolvedValue(result);

    renderWithRouter(
      <WorkspacesListContainer
        userId="user-1"
        listWorkspaces={listWorkspaces}
        onCreateWorkspace={onCreate}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /no boards yet/i })).toBeInTheDocument();
    });
  });

  it('transitions from loading to error when the query rejects', async () => {
    const listWorkspaces: ListWorkspaces = jest
      .fn()
      .mockRejectedValue(new Error('backend exploded'));
    const user = userEvent.setup();

    renderWithRouter(
      <WorkspacesListContainer
        userId="user-1"
        listWorkspaces={listWorkspaces}
        onCreateWorkspace={onCreate}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(
      screen.getByText('We could not load your boards. Please try again.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/backend exploded/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(listWorkspaces).toHaveBeenCalledTimes(2);
  });

  it('refetches when refreshToken changes', async () => {
    const result: ListWorkspacesResult = {
      status: 'ok',
      workspaces: [],
      rolesByWorkspaceId: new Map(),
    };
    const listWorkspaces: ListWorkspaces = jest.fn().mockResolvedValue(result);

    const { rerender } = renderWithRouter(
      <WorkspacesListContainer
        userId="user-1"
        listWorkspaces={listWorkspaces}
        onCreateWorkspace={onCreate}
        refreshToken={0}
      />,
    );

    await waitFor(() => {
      expect(listWorkspaces).toHaveBeenCalledTimes(1);
    });

    rerender(
      <MemoryRouter>
        <WorkspacesListContainer
          userId="user-1"
          listWorkspaces={listWorkspaces}
          onCreateWorkspace={onCreate}
          refreshToken={1}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(listWorkspaces).toHaveBeenCalledTimes(2);
    });
  });

  it('deletes an owner workspace after confirmation and refetches the list', async () => {
    const workspace = createWorkspace('Alpha');
    const result: ListWorkspacesResult = {
      status: 'ok',
      workspaces: [workspace],
      rolesByWorkspaceId: new Map([[workspace.id.value, 'owner']]),
    };
    const listWorkspaces: ListWorkspaces = jest.fn().mockResolvedValue(result);
    const deleteWorkspace: DeleteWorkspace = jest.fn().mockResolvedValue({ status: 'ok' });
    const user = userEvent.setup();

    renderWithRouter(
      <WorkspacesListContainer
        userId="user-1"
        listWorkspaces={listWorkspaces}
        deleteWorkspace={deleteWorkspace}
        onCreateWorkspace={onCreate}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Delete Alpha' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Alpha');

    await user.click(screen.getByRole('button', { name: 'Delete board' }));

    await waitFor(() => {
      expect(deleteWorkspace).toHaveBeenCalledWith({
        id: workspace.id.value,
        actorUserId: 'user-1',
      });
      expect(listWorkspaces).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('duplicates a workspace and shows the copy in the list without navigating', async () => {
    const workspace = createWorkspace('Alpha');
    const copy = Workspace.create({
      id: WorkspaceId.create('ws-copy'),
      name: 'Copy of Alpha',
      createdBy: CREATED_BY,
    });
    const result: ListWorkspacesResult = {
      status: 'ok',
      workspaces: [workspace],
      rolesByWorkspaceId: new Map([[workspace.id.value, 'owner']]),
    };
    const listWorkspaces: ListWorkspaces = jest.fn().mockResolvedValue(result);
    const duplicateWorkspace: DuplicateWorkspace = jest.fn().mockResolvedValue({
      status: 'ok',
      workspace: copy,
      copiedElementCount: 2,
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <WorkspacesListContainer
          userId="user-1"
          listWorkspaces={listWorkspaces}
          duplicateWorkspace={duplicateWorkspace}
          onCreateWorkspace={onCreate}
        />
        <LocationProbe />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Duplicate Alpha' }));

    await waitFor(() => {
      expect(duplicateWorkspace).toHaveBeenCalledWith({
        sourceWorkspaceId: workspace.id.value,
        actorUserId: 'user-1',
      });
      expect(screen.getByRole('heading', { name: 'Copy of Alpha' })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByTestId('location').textContent).toBe('/');
    expect(listWorkspaces).toHaveBeenCalledTimes(1);
  });

  it('shows a duplicate error and allows retrying without touching the list', async () => {
    const workspace = createWorkspace('Alpha');
    const result: ListWorkspacesResult = {
      status: 'ok',
      workspaces: [workspace],
      rolesByWorkspaceId: new Map([[workspace.id.value, 'owner']]),
    };
    const listWorkspaces: ListWorkspaces = jest.fn().mockResolvedValue(result);
    const duplicateWorkspace: DuplicateWorkspace = jest.fn().mockResolvedValue({
      status: 'error',
      error: createAppError('persistence', ERROR_CODES.PERSISTENCE_WRITE_FAILED, 'boom'),
    });
    const user = userEvent.setup();

    renderWithRouter(
      <WorkspacesListContainer
        userId="user-1"
        listWorkspaces={listWorkspaces}
        duplicateWorkspace={duplicateWorkspace}
        onCreateWorkspace={onCreate}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Duplicate Alpha' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The service is temporarily unavailable. Please try again.',
    );
    expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Duplicate Alpha' }));
    await waitFor(() => expect(duplicateWorkspace).toHaveBeenCalledTimes(2));
    expect(listWorkspaces).toHaveBeenCalledTimes(1);
  });

  it('edits a workspace from the card and updates the list', async () => {
    const workspace = createWorkspace('Alpha');
    const updated = Workspace.create({
      id: workspace.id,
      name: 'Renamed',
      description: 'New description',
      createdBy: CREATED_BY,
    });
    const result: ListWorkspacesResult = {
      status: 'ok',
      workspaces: [workspace],
      rolesByWorkspaceId: new Map([[workspace.id.value, 'owner']]),
    };
    const listWorkspaces: ListWorkspaces = jest.fn().mockResolvedValue(result);
    const updateWorkspace: UpdateWorkspace = jest.fn().mockResolvedValue({
      status: 'ok',
      workspace: updated,
    });
    const user = userEvent.setup();

    renderWithRouter(
      <WorkspacesListContainer
        userId="user-1"
        listWorkspaces={listWorkspaces}
        updateWorkspace={updateWorkspace}
        onCreateWorkspace={onCreate}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Edit Alpha' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('Edit board');
    expect(screen.getByLabelText('Name')).toHaveValue('Alpha');

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Renamed');
    await user.type(screen.getByLabelText('Description'), 'New description');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(updateWorkspace).toHaveBeenCalledWith({
        id: workspace.id.value,
        name: 'Renamed',
        description: 'New description',
      });
      expect(screen.getByRole('heading', { name: 'Renamed' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Alpha' })).not.toBeInTheDocument();
  });
});
