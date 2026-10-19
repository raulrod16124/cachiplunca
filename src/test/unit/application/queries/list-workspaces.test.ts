import {
  createListWorkspaces,
  sortWorkspacesForList,
  type ListWorkspacesResult,
} from '../../../../application/queries';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { Workspace } from '../../../../domain/workspace';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeMembershipRepository } from '../../../fixtures/fake-membership-repository';
import { FakeWorkspaceRepository } from '../../../fixtures/fake-workspace-repository';

const CREATED_BY = UserId.create('user-1');
const USER = UserId.create('user-1');

function buildWorkspace(
  id: string,
  timestamps: { createdAt: Date; updatedAt?: Date } = { createdAt: new Date('2026-01-01') },
): Workspace {
  return Workspace.create({
    createdBy: CREATED_BY,
    id: WorkspaceId.create(id),
    name: `Workspace ${id}`,
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt ?? timestamps.createdAt,
  });
}

async function seedMembership(
  memberships: FakeMembershipRepository,
  workspaceId: string,
  userId: UserId = USER,
): Promise<void> {
  await memberships.create({
    userId,
    workspaceId: WorkspaceId.create(workspaceId),
    role: 'owner',
  });
}

describe('sortWorkspacesForList', () => {
  it('orders workspaces by most recently updated first', () => {
    const older = buildWorkspace('ws-a', { createdAt: new Date('2026-01-01') });
    const newer = buildWorkspace('ws-b', { createdAt: new Date('2026-02-01') });
    const newest = buildWorkspace('ws-c', {
      createdAt: new Date('2026-03-01'),
      updatedAt: new Date('2026-04-01'),
    });

    const sorted = sortWorkspacesForList([older, newest, newer]);

    expect(sorted.map((workspace) => workspace.id.value)).toEqual(['ws-c', 'ws-b', 'ws-a']);
  });

  it('breaks updatedAt ties by createdAt, most recent first', () => {
    const sameUpdate = new Date('2026-06-01');
    const earlier = buildWorkspace('ws-a', {
      createdAt: new Date('2026-01-01'),
      updatedAt: sameUpdate,
    });
    const later = buildWorkspace('ws-b', {
      createdAt: new Date('2026-02-01'),
      updatedAt: sameUpdate,
    });

    const sorted = sortWorkspacesForList([earlier, later]);

    expect(sorted.map((workspace) => workspace.id.value)).toEqual(['ws-b', 'ws-a']);
  });

  it('breaks full ties by id so the order is deterministic', () => {
    const timestamps = { createdAt: new Date('2026-01-01') };
    const first = buildWorkspace('ws-a', timestamps);
    const second = buildWorkspace('ws-b', timestamps);

    const ascending = sortWorkspacesForList([second, first]);
    const descending = sortWorkspacesForList([first, second]);

    expect(ascending.map((workspace) => workspace.id.value)).toEqual(['ws-a', 'ws-b']);
    expect(descending.map((workspace) => workspace.id.value)).toEqual(['ws-a', 'ws-b']);
  });

  it('does not mutate the input array', () => {
    const older = buildWorkspace('ws-a', { createdAt: new Date('2026-01-01') });
    const newer = buildWorkspace('ws-b', { createdAt: new Date('2026-02-01') });
    const input = [older, newer];

    const sorted = sortWorkspacesForList(input);

    expect(input.map((workspace) => workspace.id.value)).toEqual(['ws-a', 'ws-b']);
    expect(sorted).not.toBe(input);
  });
});

describe('createListWorkspaces', () => {
  it('returns an empty list when the user has no memberships', async () => {
    const workspaces = new FakeWorkspaceRepository();
    const memberships = new FakeMembershipRepository();
    await workspaces.create({ createdBy: CREATED_BY, name: 'Not mine' });
    const listWorkspaces = createListWorkspaces(workspaces, memberships);

    const result = await listWorkspaces(USER.value);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.workspaces).toEqual([]);
    }
  });

  it('returns only the workspaces where the user is a member', async () => {
    const workspaces = new FakeWorkspaceRepository();
    const memberships = new FakeMembershipRepository();
    const mine = await workspaces.create({ createdBy: CREATED_BY, name: 'Mine' });
    await workspaces.create({ createdBy: CREATED_BY, name: 'Someone else' });
    await seedMembership(memberships, mine.id.value);

    const listWorkspaces = createListWorkspaces(workspaces, memberships);

    const result = await listWorkspaces(USER.value);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.workspaces.map((workspace) => workspace.name)).toEqual(['Mine']);
    }
  });

  it('ignores memberships whose workspace no longer exists', async () => {
    const workspaces = new FakeWorkspaceRepository();
    const memberships = new FakeMembershipRepository();
    await seedMembership(memberships, 'ws-deleted');
    const listWorkspaces = createListWorkspaces(workspaces, memberships);

    const result = await listWorkspaces(USER.value);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.workspaces).toEqual([]);
    }
  });

  it('orders the result by most recently updated first', async () => {
    const workspaces = new FakeWorkspaceRepository();
    const memberships = new FakeMembershipRepository();
    const older = buildWorkspace('ws-a', { createdAt: new Date('2026-01-01') });
    const newer = buildWorkspace('ws-b', {
      createdAt: new Date('2026-02-01'),
      updatedAt: new Date('2026-03-01'),
    });
    jest.spyOn(workspaces, 'findById').mockImplementation(async (id) => {
      if (id.value === older.id.value) {
        return older;
      }
      if (id.value === newer.id.value) {
        return newer;
      }
      return null;
    });
    await seedMembership(memberships, older.id.value);
    await seedMembership(memberships, newer.id.value);
    const listWorkspaces = createListWorkspaces(workspaces, memberships);

    const result = await listWorkspaces(USER.value);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.workspaces.map((workspace) => workspace.id.value)).toEqual(['ws-b', 'ws-a']);
    }
  });

  it('preserves AppErrors thrown by the membership repository', async () => {
    const workspaces = new FakeWorkspaceRepository();
    const memberships = new FakeMembershipRepository();
    jest.spyOn(memberships, 'listByUser').mockRejectedValue({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
      message: 'Network request failed.',
    });
    const listWorkspaces = createListWorkspaces(workspaces, memberships);

    const result: ListWorkspacesResult = await listWorkspaces(USER.value);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('network');
      expect(result.error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
    }
  });

  it('normalizes unexpected errors into AppError', async () => {
    const workspaces = new FakeWorkspaceRepository();
    const memberships = new FakeMembershipRepository();
    jest.spyOn(memberships, 'listByUser').mockRejectedValue(new Error('socket hang up'));
    const listWorkspaces = createListWorkspaces(workspaces, memberships);

    const result: ListWorkspacesResult = await listWorkspaces(USER.value);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    }
  });
});
