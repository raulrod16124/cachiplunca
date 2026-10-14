import { createListWorkspaceMembers, sortWorkspaceMembers } from '../../../../application/queries';
import type { MembershipRepository } from '../../../../application/ports';
import { Membership, type MembershipRole } from '../../../../domain/membership';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../../shared/errors';
import { FakeMembershipRepository } from '../../../fixtures/fake-membership-repository';

function buildMembership(userId: string, role: MembershipRole, workspaceId = 'ws-1'): Membership {
  return Membership.create({
    userId: UserId.create(userId),
    workspaceId: WorkspaceId.create(workspaceId),
    role,
  });
}

describe('sortWorkspaceMembers', () => {
  it('orders members by role precedence owner, editor, viewer', () => {
    const sorted = sortWorkspaceMembers([
      buildMembership('user-viewer', 'viewer'),
      buildMembership('user-owner', 'owner'),
      buildMembership('user-editor', 'editor'),
    ]);

    expect(sorted.map((member) => member.role)).toEqual(['owner', 'editor', 'viewer']);
  });

  it('breaks role ties by userId so the order is deterministic', () => {
    const sorted = sortWorkspaceMembers([
      buildMembership('user-b', 'editor'),
      buildMembership('user-a', 'editor'),
    ]);

    expect(sorted.map((member) => member.userId.value)).toEqual(['user-a', 'user-b']);
  });
});

describe('createListWorkspaceMembers', () => {
  it('returns the members of the workspace sorted by role and id', async () => {
    const repository = new FakeMembershipRepository();
    await repository.create({
      userId: UserId.create('user-viewer'),
      workspaceId: WorkspaceId.create('ws-1'),
      role: 'viewer',
    });
    await repository.create({
      userId: UserId.create('user-owner'),
      workspaceId: WorkspaceId.create('ws-1'),
      role: 'owner',
    });
    const listWorkspaceMembers = createListWorkspaceMembers(repository);

    const result = await listWorkspaceMembers('ws-1');

    if (result.status !== 'ok') {
      throw new Error(`Expected ok, received ${result.status}`);
    }
    expect(result.members.map((member) => member.userId.value)).toEqual([
      'user-owner',
      'user-viewer',
    ]);
  });

  it('returns an empty list when the workspace has no members', async () => {
    const listWorkspaceMembers = createListWorkspaceMembers(new FakeMembershipRepository());

    await expect(listWorkspaceMembers('ws-1')).resolves.toEqual({ status: 'ok', members: [] });
  });

  it('isolates members by workspace', async () => {
    const repository = new FakeMembershipRepository();
    await repository.create({
      userId: UserId.create('user-a'),
      workspaceId: WorkspaceId.create('ws-1'),
      role: 'owner',
    });
    await repository.create({
      userId: UserId.create('user-b'),
      workspaceId: WorkspaceId.create('ws-2'),
      role: 'owner',
    });
    const listWorkspaceMembers = createListWorkspaceMembers(repository);

    const result = await listWorkspaceMembers('ws-1');

    if (result.status !== 'ok') {
      throw new Error(`Expected ok, received ${result.status}`);
    }
    expect(result.members.map((member) => member.userId.value)).toEqual(['user-a']);
  });

  it('translates repository failures into an AppError result', async () => {
    const error = createAppError(
      'network',
      ERROR_CODES.NETWORK_REQUEST_FAILED,
      'The network connection was lost.',
    );
    const repository: MembershipRepository = {
      create: async () => {
        throw new Error('not used');
      },
      findByUserAndWorkspace: async () => null,
      listByWorkspace: async () => {
        throw error;
      },
      listByUser: async () => [],
      updateRole: async () => {
        throw new Error('not used');
      },
      delete: async () => undefined,
    };
    const listWorkspaceMembers = createListWorkspaceMembers(repository);

    await expect(listWorkspaceMembers('ws-1')).resolves.toEqual({ status: 'error', error });
  });
});
