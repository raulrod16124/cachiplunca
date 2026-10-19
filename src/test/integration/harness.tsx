import { render, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { SessionProvider } from '../../presentation/providers/session-provider';
import { AppRoutes, type AppRoutesProps } from '../../app/routes/app-routes';
import {
  createAcceptInvitation,
  createChangeMemberRole,
  createCreateOwnerMembership,
  createCreateWorkspaceWithOwner,
  createInviteMember,
  createLeaveWorkspace,
  createLoginUser,
  createLogoutUser,
  createRegisterUser,
  createRemoveMember,
} from '../../application/commands';
import {
  createGetWorkspace,
  createGetWorkspaceRole,
  createListPendingInvitations,
  createListWorkspaceMembers,
  createListWorkspaces,
  createLoadWorkspaceElements,
} from '../../application/queries';
import {
  createElementPersistence,
  createElementPersistenceOrchestrator,
  createRealtimeSubscriptionManager,
  createSessionStore,
} from '../../application/services';
import type { AuthCredentials, AuthPort, AuthUser } from '../../application/ports';
import type { Workspace } from '../../domain/workspace';
import { ElementId, UserId } from '../../domain/shared';
import { FakeAuthPort } from '../fixtures/fake-auth-port';
import { FakeElementRepository } from '../fixtures/fake-element-repository';
import { FakeMembershipRepository } from '../fixtures/fake-membership-repository';
import { FakePresencePort } from '../fixtures/fake-presence-port';
import { FakeRealtimePort } from '../fixtures/fake-realtime-port';
import { FakeWorkspaceRepository } from '../fixtures/fake-workspace-repository';
import { FakeInvitationRepository } from '../fixtures/fake-invitation-repository';
import { hashInvitationToken } from '../../infrastructure/crypto/invitation-token';
import { InvitationId } from '../../domain/shared';

export const DEFAULT_CREDENTIALS: AuthCredentials = {
  email: 'user@example.com',
  password: 'secret123',
};

export function LocationProbe(): ReactNode {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

export interface RenderAppRoutesOptions {
  readonly authPort: AuthPort;
  readonly props: AppRoutesProps;
  readonly initialPath?: string;
  readonly showLocation?: boolean;
}

/**
 * Renders `AppRoutes` inside the same `MemoryRouter` + `SessionProvider` +
 * optional `LocationProbe` shell every integration test needs, removing the
 * duplicated JSX boilerplate while letting each test provide its own services.
 */
export function renderAppRoutes({
  authPort,
  props,
  initialPath = '/workspaces',
  showLocation = true,
}: RenderAppRoutesOptions): RenderResult {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SessionProvider store={createSessionStore(authPort)}>
        <AppRoutes {...props} />
      </SessionProvider>
      {showLocation ? <LocationProbe /> : null}
    </MemoryRouter>,
  );
}

export interface AppHarness {
  readonly authPort: FakeAuthPort;
  readonly workspaceRepository: FakeWorkspaceRepository;
  readonly membershipRepository: FakeMembershipRepository;
  readonly elementRepository: FakeElementRepository;
  readonly realtimePort: FakeRealtimePort;
  readonly presencePort: FakePresencePort;
  readonly invitationRepository: FakeInvitationRepository;
  readonly services: AppRoutesProps;
  readonly currentUser: AuthUser | null;
  register(credentials?: AuthCredentials): Promise<AuthUser>;
  createOwnerWorkspace(name: string): Promise<Workspace>;
  render(options?: Omit<RenderAppRoutesOptions, 'authPort' | 'props'>): RenderResult;
}

/**
 * Builds a full, production-shaped `AppRoutes` wiring backed by in-memory fakes
 * (no Firebase). Reuse a single harness across re-renders to exercise reloads
 * against the same persisted state.
 */
export function createAppHarness(): AppHarness {
  const authPort = new FakeAuthPort();
  const workspaceRepository = new FakeWorkspaceRepository();
  const membershipRepository = new FakeMembershipRepository();
  const elementRepository = new FakeElementRepository();
  const realtimePort = new FakeRealtimePort();
  const presencePort = new FakePresencePort();
  const invitationRepository = new FakeInvitationRepository();

  let elementSequence = 0;
  let currentUser: AuthUser | null = null;

  authPort.observeSession((user) => {
    currentUser = user;
  });

  const services: AppRoutesProps = {
    registerUser: createRegisterUser(authPort),
    loginUser: createLoginUser(authPort),
    logoutUser: createLogoutUser(authPort),
    listWorkspaces: createListWorkspaces(workspaceRepository),
    createWorkspaceWithOwner: createCreateWorkspaceWithOwner({
      workspaceRepository,
      createOwnerMembership: createCreateOwnerMembership(membershipRepository),
    }),
    getWorkspace: createGetWorkspace(workspaceRepository),
    getWorkspaceRole: createGetWorkspaceRole(membershipRepository),
    listWorkspaceMembers: createListWorkspaceMembers(membershipRepository),
    changeMemberRole: createChangeMemberRole(membershipRepository),
    removeMember: createRemoveMember(membershipRepository),
    leaveWorkspace: createLeaveWorkspace(membershipRepository),
    inviteMember: createInviteMember({
      invitationRepository,
      membershipRepository,
      generateId: () => InvitationId.create(`inv-${++elementSequence}`),
      issueToken: async () => {
        const token = `token-${++elementSequence}`;
        return { token, tokenHash: await hashInvitationToken(token) };
      },
    }),
    listPendingInvitations: createListPendingInvitations(invitationRepository),
    acceptInvitation: createAcceptInvitation({
      invitationRepository,
      membershipRepository,
      hashToken: hashInvitationToken,
    }),
    loadWorkspaceElements: createLoadWorkspaceElements(elementRepository),
    elementPersistenceOrchestrator: createElementPersistenceOrchestrator(
      createElementPersistence(elementRepository),
    ),
    realtimeSubscriptionManager: createRealtimeSubscriptionManager(realtimePort),
    generateElementId: () => ElementId.create(`el-${++elementSequence}`),
    presencePort,
  };

  return {
    authPort,
    workspaceRepository,
    membershipRepository,
    elementRepository,
    realtimePort,
    presencePort,
    invitationRepository,
    services,
    get currentUser(): AuthUser | null {
      return currentUser;
    },
    async register(credentials: AuthCredentials = DEFAULT_CREDENTIALS): Promise<AuthUser> {
      return authPort.signUp(credentials);
    },
    async createOwnerWorkspace(name: string): Promise<Workspace> {
      if (currentUser === null) {
        throw new Error('Register a user before creating an owner workspace.');
      }

      const workspace = await workspaceRepository.create({
        name,
        createdBy: UserId.create(currentUser.uid),
      });
      await membershipRepository.create({
        userId: UserId.create(currentUser.uid),
        workspaceId: workspace.id,
        role: 'owner',
      });
      return workspace;
    },
    render(options: Omit<RenderAppRoutesOptions, 'authPort' | 'props'> = {}): RenderResult {
      return renderAppRoutes({ authPort, props: services, ...options });
    },
  };
}
