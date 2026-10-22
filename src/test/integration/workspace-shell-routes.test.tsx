import { fireEvent, screen } from '@testing-library/react';
import {
  createCreateOwnerMembership,
  createCreateWorkspaceWithOwner,
  createLoginUser,
  createLogoutUser,
  createRegisterUser,
} from '../../application/commands';
import {
  createGetWorkspace,
  createListWorkspaces,
  createLoadWorkspaceElements,
} from '../../application/queries';
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

async function renderAuthenticatedApp(initialPath = '/workspaces') {
  const authPort = new FakeAuthPort();
  const user = await authPort.signUp(CREDENTIALS);

  const repository = new FakeWorkspaceRepository();
  const membershipRepository = new FakeMembershipRepository();
  const workspace = await repository.create({
    name: 'Roadmap Q4',
    createdBy: UserId.create(user.uid),
  });
  await membershipRepository.create({
    userId: UserId.create(user.uid),
    workspaceId: workspace.id,
    role: 'owner',
  });
  const elementRepository = new FakeElementRepository();
  let elementSequence = 0;
  const generateElementId = () => ElementId.create(`el-${++elementSequence}`);

  const view = renderAppRoutes({
    authPort,
    initialPath,
    props: {
      registerUser: createRegisterUser(authPort),
      loginUser: createLoginUser(authPort),
      logoutUser: createLogoutUser(authPort),
      listWorkspaces: createListWorkspaces(repository, membershipRepository),
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

  return { ...view, repository, elementRepository, workspace };
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

    expect(await screen.findByRole('heading', { name: 'Board not found' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to boards' }));

    expect(await screen.findByRole('heading', { name: 'Your boards' })).toBeInTheDocument();
  });
});
