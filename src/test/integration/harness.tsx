import { render, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { SessionProvider } from '../../presentation/providers/session-provider';
import { UserSettingsProvider } from '../../presentation/providers/user-settings-provider';
import { AppRoutes, type AppRoutesProps } from '../../app/routes/app-routes';
import {
  createAcceptInvitation,
  createAcceptInvitationById,
  createCreateComment,
  createEditComment,
  createRefreshUser,
  createResolveComment,
  createSendEmailVerification,
  createChangeMemberRole,
  createCreateOwnerMembership,
  createCreateWorkspaceWithOwner,
  createCreateGuestLink,
  createOpenGuestWorkspace,
  createRevokeGuestLink,
  createDeleteImage,
  createDeleteWorkspace,
  createDuplicateWorkspace,
  createInviteMember,
  createLeaveWorkspace,
  createLoginUser,
  createLogoutUser,
  createRegisterUser,
  createRemoveMember,
  createUpdateWorkspace,
  createUploadImage,
} from '../../application/commands';
import {
  createGetWorkspace,
  createGetWorkspaceRole,
  createListPendingInvitations,
  createListPendingInvitationsForUser,
  createWatchPendingInvitationsForUser,
  createListComments,
  createListWorkspaceComments,
  createListActiveGuestLinks,
  createListWorkspaceMembers,
  createListWorkspaces,
  createLoadWorkspaceElements,
} from '../../application/queries';
import {
  createElementPersistence,
  createElementPersistenceOrchestrator,
  createRealtimeSubscriptionManager,
  createSessionStore,
  createUserSettingsStore,
} from '../../application/services';
import type { AuthPort, AuthSignUpInput, AuthUser } from '../../application/ports';
import type { Workspace } from '../../domain/workspace';
import { ElementId, UserId } from '../../domain/shared';
import { CommentId } from '../../domain/shared';
import { FakeAuthPort } from '../fixtures/fake-auth-port';
import { FakeCommentRepository } from '../fixtures/fake-comment-repository';
import { FakeElementRepository } from '../fixtures/fake-element-repository';
import { FakeMembershipRepository } from '../fixtures/fake-membership-repository';
import { FakePresencePort } from '../fixtures/fake-presence-port';
import { FakeRealtimePort } from '../fixtures/fake-realtime-port';
import { FakeWorkspaceRepository } from '../fixtures/fake-workspace-repository';
import { FakeInvitationRepository } from '../fixtures/fake-invitation-repository';
import { FakeGuestLinkRepository } from '../fixtures/fake-guest-link-repository';
import {
  createFakeImageStoragePort,
  type FakeImageStoragePort,
} from '../fixtures/fake-image-storage-port';
import { hashInvitationToken } from '../../infrastructure/crypto/invitation-token';
import { hashGuestLinkToken } from '../../infrastructure/crypto/guest-link-token';
import { InvitationId } from '../../domain/shared';

export const DEFAULT_CREDENTIALS: AuthSignUpInput = {
  email: 'user@example.com',
  password: 'secret123',
  displayName: 'Test User',
};

export function LocationProbe(): ReactNode {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
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
  const userSettingsStore = createUserSettingsStore(
    {
      getByUserId: async () => null,
      upsert: async (settings) => settings,
    },
    {
      getReducedMotionPref: () => false,
      getLanguages: () => ['en-US'],
    },
  );

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <UserSettingsProvider store={userSettingsStore} userId={null}>
        <SessionProvider store={createSessionStore(authPort)}>
          <AppRoutes {...props} />
        </SessionProvider>
        {showLocation ? <LocationProbe /> : null}
      </UserSettingsProvider>
    </MemoryRouter>,
  );
}

export interface AppHarness {
  readonly authPort: FakeAuthPort;
  readonly workspaceRepository: FakeWorkspaceRepository;
  readonly membershipRepository: FakeMembershipRepository;
  readonly elementRepository: FakeElementRepository;
  readonly commentRepository: FakeCommentRepository;
  readonly realtimePort: FakeRealtimePort;
  readonly presencePort: FakePresencePort;
  readonly invitationRepository: FakeInvitationRepository;
  readonly imageStoragePort: FakeImageStoragePort;
  readonly guestLinkRepository: FakeGuestLinkRepository;
  readonly services: AppRoutesProps;
  readonly currentUser: AuthUser | null;
  register(credentials?: AuthSignUpInput): Promise<AuthUser>;
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
  const commentRepository = new FakeCommentRepository();
  const realtimePort = new FakeRealtimePort();
  const presencePort = new FakePresencePort();
  const invitationRepository = new FakeInvitationRepository();
  const imageStoragePort = createFakeImageStoragePort();
  const guestLinkRepository = new FakeGuestLinkRepository();

  let elementSequence = 0;
  let currentUser: AuthUser | null = null;
  const generateElementId = () => ElementId.create(`el-${++elementSequence}`);

  authPort.observeSession((user) => {
    currentUser = user;
  });

  const services: AppRoutesProps = {
    registerUser: createRegisterUser(authPort),
    loginUser: createLoginUser(authPort),
    logoutUser: createLogoutUser(authPort),
    sendEmailVerification: createSendEmailVerification(authPort),
    refreshUser: createRefreshUser(authPort),
    listWorkspaces: createListWorkspaces(workspaceRepository, membershipRepository),
    createWorkspaceWithOwner: createCreateWorkspaceWithOwner({
      workspaceRepository,
      membershipRepository,
      elementRepository,
      createOwnerMembership: createCreateOwnerMembership(membershipRepository),
      generateId: generateElementId,
    }),
    deleteWorkspace: createDeleteWorkspace({ workspaceRepository, membershipRepository }),
    updateWorkspace: createUpdateWorkspace(workspaceRepository),
    duplicateWorkspace: createDuplicateWorkspace({
      workspaceRepository,
      membershipRepository,
      elementRepository,
      loadWorkspaceElements: createLoadWorkspaceElements(elementRepository),
      createWorkspaceWithOwner: createCreateWorkspaceWithOwner({
        workspaceRepository,
        membershipRepository,
        elementRepository,
        createOwnerMembership: createCreateOwnerMembership(membershipRepository),
        generateId: generateElementId,
      }),
      generateId: generateElementId,
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
    listPendingInvitationsForUser: createListPendingInvitationsForUser(invitationRepository),
    watchPendingInvitationsForUser: createWatchPendingInvitationsForUser(invitationRepository),
    acceptInvitation: createAcceptInvitation({
      invitationRepository,
      membershipRepository,
      hashToken: hashInvitationToken,
    }),
    acceptInvitationById: createAcceptInvitationById({
      invitationRepository,
      membershipRepository,
    }),
    loadWorkspaceElements: createLoadWorkspaceElements(elementRepository),
    elementPersistenceOrchestrator: createElementPersistenceOrchestrator(
      createElementPersistence(elementRepository),
    ),
    realtimeSubscriptionManager: createRealtimeSubscriptionManager(realtimePort),
    generateElementId,
    presencePort,
    comments: {
      listWorkspaceComments: createListWorkspaceComments(commentRepository),
      listComments: createListComments(commentRepository),
      createComment: createCreateComment({
        repository: commentRepository,
        generateId: () => CommentId.create(`comment-${++elementSequence}`),
      }),
      editComment: createEditComment({ repository: commentRepository }),
      resolveComment: createResolveComment({ repository: commentRepository }),
    },
    imageServices: {
      uploadImage: createUploadImage({
        storage: imageStoragePort,
        generateImageId: () => `image-${++elementSequence}`,
      }),
      deleteImage: createDeleteImage({ storage: imageStoragePort }),
    },
    guestLinks: {
      createGuestLink: createCreateGuestLink({
        guestLinkRepository,
        membershipRepository,
        issueToken: async () => {
          const token = `guest-token-${++elementSequence}`;
          return { token, tokenHash: await hashGuestLinkToken(token) };
        },
      }),
      revokeGuestLink: createRevokeGuestLink({ guestLinkRepository, membershipRepository }),
      listActiveGuestLinks: createListActiveGuestLinks({
        guestLinkRepository,
        membershipRepository,
      }),
      openGuestWorkspace: createOpenGuestWorkspace({
        guestLinkRepository,
        hashToken: hashGuestLinkToken,
        signInAnonymously: () => authPort.signInAnonymously(),
        getWorkspace: createGetWorkspace(workspaceRepository),
        loadWorkspaceElements: createLoadWorkspaceElements(elementRepository),
      }),
    },
  };

  return {
    authPort,
    workspaceRepository,
    membershipRepository,
    elementRepository,
    commentRepository,
    realtimePort,
    presencePort,
    invitationRepository,
    imageStoragePort,
    guestLinkRepository,
    services,
    get currentUser(): AuthUser | null {
      return currentUser;
    },
    async register(credentials: AuthSignUpInput = DEFAULT_CREDENTIALS): Promise<AuthUser> {
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
