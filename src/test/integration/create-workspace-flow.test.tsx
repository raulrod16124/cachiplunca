import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  createCreateOwnerMembership,
  createCreateWorkspaceWithOwner,
  createLoginUser,
  createLogoutUser,
  createRegisterUser,
} from '../../application/commands';
import { createGetWorkspace, createLoadWorkspaceElements } from '../../application/queries';
import type {
  ListWorkspaces,
  ListWorkspacesResult,
} from '../../application/queries/list-workspaces';
import {
  createElementPersistence,
  createElementPersistenceOrchestrator,
  createRealtimeSubscriptionManager,
} from '../../application/services';
import { ElementId, UserId } from '../../domain/shared';
import { FakeAuthPort } from '../fixtures/fake-auth-port';
import { FakeElementRepository } from '../fixtures/fake-element-repository';
import { FakeMembershipRepository } from '../fixtures/fake-membership-repository';
import { FakeRealtimePort } from '../fixtures/fake-realtime-port';
import { FakeWorkspaceRepository } from '../fixtures/fake-workspace-repository';
import { renderAppRoutes } from './harness';

const CREDENTIALS = { email: 'user@example.com', password: 'secret123' };

async function renderAuthenticatedApp() {
  const authPort = new FakeAuthPort();
  await authPort.signUp(CREDENTIALS);

  const repository = new FakeWorkspaceRepository();
  const membershipRepository = new FakeMembershipRepository();
  const listWorkspaces = jest.fn(async (userId: string): Promise<ListWorkspacesResult> => {
    const memberships = await membershipRepository.listByUser(UserId.create(userId));
    return {
      status: 'ok',
      workspaces: await repository.list(),
      rolesByWorkspaceId: new Map(
        memberships.map((membership) => [membership.workspaceId.value, membership.role]),
      ),
    };
  });
  const listWorkspacesQuery: ListWorkspaces = listWorkspaces;
  const elementRepository = new FakeElementRepository();
  let elementSequence = 0;
  const generateElementId = () => ElementId.create(`el-${++elementSequence}`);

  const view = renderAppRoutes({
    authPort,
    initialPath: '/workspaces',
    props: {
      registerUser: createRegisterUser(authPort),
      loginUser: createLoginUser(authPort),
      logoutUser: createLogoutUser(authPort),
      listWorkspaces: listWorkspacesQuery,
      createWorkspaceWithOwner: createCreateWorkspaceWithOwner({
        workspaceRepository: repository,
        membershipRepository,
        elementRepository,
        createOwnerMembership: createCreateOwnerMembership(membershipRepository),
        generateId: generateElementId,
      }),
      getWorkspace: createGetWorkspace(repository),
      loadWorkspaceElements: createLoadWorkspaceElements(elementRepository),
      elementPersistenceOrchestrator: createElementPersistenceOrchestrator(
        createElementPersistence(elementRepository),
      ),
      realtimeSubscriptionManager: createRealtimeSubscriptionManager(new FakeRealtimePort()),
      generateElementId,
    },
  });

  return { ...view, repository, membershipRepository, elementRepository, listWorkspaces };
}

function openCreateDialog(): void {
  const [trigger] = screen.getAllByRole('button', { name: 'Create board' });
  fireEvent.click(trigger);
}

describe('create workspace flow', () => {
  it('creates a workspace from the empty state and shows it in the list', async () => {
    const { repository, membershipRepository, listWorkspaces } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'No boards yet' })).toBeInTheDocument();
    expect(listWorkspaces).toHaveBeenCalledTimes(1);

    openCreateDialog();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Enter a board name.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Roadmap Q4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Roadmap Q4' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(listWorkspaces).toHaveBeenCalledTimes(2));

    const [workspace] = await repository.list();
    const membership = await membershipRepository.findByUserAndWorkspace(
      UserId.create('fake-uid-1'),
      workspace.id,
    );
    expect(membership?.role).toBe('owner');
  });

  it('leaves the list untouched when the dialog is cancelled', async () => {
    const { repository, membershipRepository, listWorkspaces } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'No boards yet' })).toBeInTheDocument();

    openCreateDialog();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Discarded draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(listWorkspaces).toHaveBeenCalledTimes(1);
    await expect(repository.list()).resolves.toHaveLength(0);
    await expect(
      membershipRepository.listByUser(UserId.create('fake-uid-1')),
    ).resolves.toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'No boards yet' })).toBeInTheDocument();
  });

  it('creates a workspace with the selected template and its elements', async () => {
    const { repository, elementRepository } = await renderAuthenticatedApp();

    openCreateDialog();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sprint retro' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Retrospective' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    const [workspace] = await waitFor(async () => {
      const workspaces = await repository.list();
      expect(workspaces).toHaveLength(1);
      return workspaces;
    });

    const elements = await elementRepository.listByWorkspace(workspace.id);
    expect(elements.length).toBeGreaterThan(0);
    expect(elements.some((element) => element.type === 'frame')).toBe(true);
    expect(elements.some((element) => element.type === 'note')).toBe(true);
    expect(elements.some((element) => element.type === 'task')).toBe(true);
  });
});
