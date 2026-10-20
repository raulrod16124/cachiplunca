import {
  createCreateGuestLink,
  createOpenGuestWorkspace,
  createRevokeGuestLink,
  type CreateGuestLinkDeps,
} from '../../../../application/commands';
import {
  createGetWorkspace,
  createListActiveGuestLinks,
  createLoadWorkspaceElements,
} from '../../../../application/queries';
import { GuestLink } from '../../../../domain/guest-link';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { FakeElementRepository } from '../../../fixtures/fake-element-repository';
import { FakeGuestLinkRepository } from '../../../fixtures/fake-guest-link-repository';
import { FakeMembershipRepository } from '../../../fixtures/fake-membership-repository';
import { FakeWorkspaceRepository } from '../../../fixtures/fake-workspace-repository';

const NOW = new Date('2026-10-20T10:00:00.000Z');
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

async function setup() {
  const workspaces = new FakeWorkspaceRepository();
  const memberships = new FakeMembershipRepository();
  const guestLinks = new FakeGuestLinkRepository();
  const elements = new FakeElementRepository();
  const ownerId = UserId.create('owner-1');
  const editorId = UserId.create('editor-1');
  const workspace = await workspaces.create({ name: 'Roadmap', createdBy: ownerId });

  await memberships.create({ userId: ownerId, workspaceId: workspace.id, role: 'owner' });
  await memberships.create({ userId: editorId, workspaceId: workspace.id, role: 'editor' });

  const createDeps: CreateGuestLinkDeps = {
    guestLinkRepository: guestLinks,
    membershipRepository: memberships,
    issueToken: async () => ({ token: 'token-a', tokenHash: HASH_A }),
    now: () => NOW,
  };

  return {
    workspaces,
    memberships,
    guestLinks,
    elements,
    workspace,
    ownerId,
    editorId,
    createDeps,
  };
}

function seedActiveLink(
  guestLinks: FakeGuestLinkRepository,
  workspaceId: WorkspaceId,
  ownerId: UserId = UserId.create('owner-1'),
): void {
  guestLinks.seed(
    GuestLink.create({
      tokenHash: HASH_A,
      workspaceId,
      createdBy: ownerId,
      createdAt: NOW,
    }),
  );
}

describe('createCreateGuestLink', () => {
  it('lets the owner create a link and revokes the previous active one', async () => {
    const { guestLinks, workspace, ownerId, createDeps } = await setup();
    const createGuestLink = createCreateGuestLink(createDeps);

    const first = await createGuestLink({
      workspaceId: workspace.id.value,
      actorUserId: ownerId.value,
    });
    expect(first).toMatchObject({ status: 'ok', token: 'token-a' });

    const second = await createCreateGuestLink({
      ...createDeps,
      issueToken: async () => ({ token: 'token-b', tokenHash: HASH_B }),
    })({ workspaceId: workspace.id.value, actorUserId: ownerId.value });

    expect(second).toMatchObject({ status: 'ok', token: 'token-b' });
    expect((await guestLinks.findByTokenHash(HASH_A))?.isActive()).toBe(false);
    expect((await guestLinks.findByTokenHash(HASH_B))?.isActive()).toBe(true);
  });

  it('rejects editors and outsiders', async () => {
    const { workspace, editorId, createDeps } = await setup();
    const createGuestLink = createCreateGuestLink(createDeps);

    await expect(
      createGuestLink({ workspaceId: workspace.id.value, actorUserId: editorId.value }),
    ).resolves.toMatchObject({ status: 'error', error: { code: 'auth/forbidden' } });
    await expect(
      createGuestLink({ workspaceId: workspace.id.value, actorUserId: 'outsider' }),
    ).resolves.toMatchObject({ status: 'error', error: { code: 'auth/forbidden' } });
  });

  it('validates required ids', async () => {
    const { createDeps } = await setup();
    const createGuestLink = createCreateGuestLink(createDeps);

    await expect(createGuestLink({ workspaceId: '', actorUserId: '' })).resolves.toMatchObject({
      status: 'invalid-input',
    });
  });
});

describe('createRevokeGuestLink', () => {
  it('revokes the active link for the owner and is idempotent', async () => {
    const { guestLinks, memberships, workspace, ownerId } = await setup();
    seedActiveLink(guestLinks, workspace.id, ownerId);
    const revokeGuestLink = createRevokeGuestLink({
      guestLinkRepository: guestLinks,
      membershipRepository: memberships,
    });

    await expect(
      revokeGuestLink({
        workspaceId: workspace.id.value,
        actorUserId: ownerId.value,
        tokenHash: HASH_A,
      }),
    ).resolves.toEqual({ status: 'ok' });
    await expect(
      revokeGuestLink({
        workspaceId: workspace.id.value,
        actorUserId: ownerId.value,
        tokenHash: HASH_A,
      }),
    ).resolves.toEqual({ status: 'ok' });
    expect((await guestLinks.findByTokenHash(HASH_A))?.isActive()).toBe(false);
  });

  it('rejects editors and unknown links', async () => {
    const { guestLinks, memberships, workspace, editorId, ownerId } = await setup();
    seedActiveLink(guestLinks, workspace.id, ownerId);
    const revokeGuestLink = createRevokeGuestLink({
      guestLinkRepository: guestLinks,
      membershipRepository: memberships,
    });

    await expect(
      revokeGuestLink({
        workspaceId: workspace.id.value,
        actorUserId: editorId.value,
        tokenHash: HASH_A,
      }),
    ).resolves.toMatchObject({ status: 'error', error: { code: 'auth/forbidden' } });
    await expect(
      revokeGuestLink({
        workspaceId: workspace.id.value,
        actorUserId: ownerId.value,
        tokenHash: HASH_B,
      }),
    ).resolves.toMatchObject({ status: 'error', error: { code: 'not-found/resource' } });
  });
});

describe('createListActiveGuestLinks', () => {
  it('returns active links only for the owner', async () => {
    const { guestLinks, memberships, workspace, ownerId, editorId } = await setup();
    seedActiveLink(guestLinks, workspace.id, ownerId);

    const list = createListActiveGuestLinks({
      guestLinkRepository: guestLinks,
      membershipRepository: memberships,
    });

    await expect(
      list({ workspaceId: workspace.id.value, userId: ownerId.value }),
    ).resolves.toMatchObject({ status: 'ok', links: [{ tokenHash: HASH_A }] });
    await expect(
      list({ workspaceId: workspace.id.value, userId: editorId.value }),
    ).resolves.toMatchObject({ status: 'error', error: { code: 'auth/forbidden' } });
  });
});

describe('createOpenGuestWorkspace', () => {
  it('resolves the link, opens an anonymous session and loads the board', async () => {
    const { workspaces, guestLinks, elements, workspace, ownerId } = await setup();
    seedActiveLink(guestLinks, workspace.id, ownerId);
    const open = createOpenGuestWorkspace({
      guestLinkRepository: guestLinks,
      hashToken: async () => HASH_A,
      signInAnonymously: async () => ({
        uid: 'guest-uid',
        email: null,
        emailVerified: false,
        displayName: null,
      }),
      getWorkspace: createGetWorkspace(workspaces),
      loadWorkspaceElements: createLoadWorkspaceElements(elements),
    });

    const result = await open({ token: 'token-a' });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.workspace.id.value).toBe(workspace.id.value);
      expect(result.elements).toEqual([]);
    }
    expect(guestLinks.getSession('guest-uid')).toMatchObject({
      workspaceId: workspace.id,
      tokenHash: HASH_A,
    });
  });

  it('reports invalid and revoked links without signing in', async () => {
    const { workspaces, guestLinks, elements, workspace, ownerId } = await setup();
    const signInAnonymously = jest.fn(async () => ({
      uid: 'guest-uid',
      email: null,
      emailVerified: false,
      displayName: null,
    }));
    const open = createOpenGuestWorkspace({
      guestLinkRepository: guestLinks,
      hashToken: async () => HASH_A,
      signInAnonymously,
      getWorkspace: createGetWorkspace(workspaces),
      loadWorkspaceElements: createLoadWorkspaceElements(elements),
    });

    await expect(open({ token: 'unknown' })).resolves.toEqual({ status: 'invalid' });

    guestLinks.seed(
      GuestLink.create({
        tokenHash: HASH_A,
        workspaceId: workspace.id,
        createdBy: ownerId,
        createdAt: NOW,
      }).revoke(new Date(NOW.getTime() + 1)),
    );
    await expect(open({ token: 'token-a' })).resolves.toEqual({ status: 'revoked' });
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('uses the current user id when one is provided', async () => {
    const { workspaces, guestLinks, elements, workspace, ownerId } = await setup();
    seedActiveLink(guestLinks, workspace.id, ownerId);
    const signInAnonymously = jest.fn();
    const open = createOpenGuestWorkspace({
      guestLinkRepository: guestLinks,
      hashToken: async () => HASH_A,
      signInAnonymously,
      getWorkspace: createGetWorkspace(workspaces),
      loadWorkspaceElements: createLoadWorkspaceElements(elements),
    });

    await open({ token: 'token-a', currentUserId: 'known-user' });

    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(guestLinks.getSession('known-user')).toMatchObject({ workspaceId: workspace.id });
  });
});
