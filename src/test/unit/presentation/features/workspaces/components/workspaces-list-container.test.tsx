import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { WorkspacesListContainer } from '../../../../../../presentation/features/workspaces/components/workspaces-list-container';
import type {
  ListWorkspaces,
  ListWorkspacesResult,
} from '../../../../../../application/queries/list-workspaces';
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

describe('WorkspacesListContainer', () => {
  const onCreate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('transitions from loading to success and renders workspaces', async () => {
    const workspaces = [createWorkspace('Alpha')];
    const result: ListWorkspacesResult = { status: 'ok', workspaces };
    const listWorkspaces: ListWorkspaces = jest.fn().mockResolvedValue(result);

    renderWithRouter(
      <WorkspacesListContainer listWorkspaces={listWorkspaces} onCreateWorkspace={onCreate} />,
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
      <WorkspacesListContainer listWorkspaces={listWorkspaces} onCreateWorkspace={onCreate} />,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText('We could not load your workspaces. Please try again.'),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(listWorkspaces).toHaveBeenCalledTimes(2);
  });

  it('shows empty state when no workspaces', async () => {
    const result: ListWorkspacesResult = { status: 'ok', workspaces: [] };
    const listWorkspaces: ListWorkspaces = jest.fn().mockResolvedValue(result);

    renderWithRouter(
      <WorkspacesListContainer listWorkspaces={listWorkspaces} onCreateWorkspace={onCreate} />,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /no workspaces yet/i })).toBeInTheDocument();
    });
  });

  it('transitions from loading to error when the query rejects', async () => {
    const listWorkspaces: ListWorkspaces = jest
      .fn()
      .mockRejectedValue(new Error('backend exploded'));
    const user = userEvent.setup();

    renderWithRouter(
      <WorkspacesListContainer listWorkspaces={listWorkspaces} onCreateWorkspace={onCreate} />,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(
      screen.getByText('We could not load your workspaces. Please try again.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/backend exploded/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(listWorkspaces).toHaveBeenCalledTimes(2);
  });

  it('refetches when refreshToken changes', async () => {
    const result: ListWorkspacesResult = { status: 'ok', workspaces: [] };
    const listWorkspaces: ListWorkspaces = jest.fn().mockResolvedValue(result);

    const { rerender } = renderWithRouter(
      <WorkspacesListContainer
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
});
