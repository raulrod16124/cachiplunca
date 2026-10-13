import {
  createChangeMemberRole,
  type ChangeMemberRoleResult,
} from '../../../../application/commands';
import type { MembershipRole } from '../../../../domain/membership';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeMembershipRepository } from '../../../fixtures/fake-membership-repository';

const ACTOR = UserId.create('user-owner');
const TARGET = UserId.create('user-member');
const WORKSPACE = WorkspaceId.create('ws-1');
const OTHER_WORKSPACE = WorkspaceId.create('ws-2');

async function seedMember(
  repository: FakeMembershipRepository,
  userId: UserId,
  role: MembershipRole,
  workspace: WorkspaceId = WORKSPACE,
): Promise<void> {
  await repository.create({ userId, workspaceId: workspace, role });
}

describe('createChangeMemberRole', () => {
  it('lets an owner change another member role and persists it', async () => {
    const repository = new FakeMembershipRepository();
    await seedMember(repository, ACTOR, 'owner');
    await seedMember(repository, TARGET, 'viewer');
    const changeMemberRole = createChangeMemberRole(repository);

    const result = await changeMemberRole({
      workspaceId: WORKSPACE,
      actorUserId: ACTOR,
      targetUserId: TARGET,
      role: 'editor',
    });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.membership.userId.equals(TARGET)).toBe(true);
      expect(result.membership.role).toBe('editor');
    }

    const stored = await repository.findByUserAndWorkspace(TARGET, WORKSPACE);
    expect(stored?.role).toBe('editor');
  });

  it('lets an owner promote a member to owner', async () => {
    const repository = new FakeMembershipRepository();
    await seedMember(repository, ACTOR, 'owner');
    await seedMember(repository, TARGET, 'editor');
    const changeMemberRole = createChangeMemberRole(repository);

    const result = await changeMemberRole({
      workspaceId: WORKSPACE,
      actorUserId: ACTOR,
      targetUserId: TARGET,
      role: 'owner',
    });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.membership.isOwner()).toBe(true);
    }
  });

  it.each<MembershipRole>(['editor', 'viewer'])(
    'forbids a %s from changing roles without touching the repository',
    async (actorRole) => {
      const repository = new FakeMembershipRepository();
      await seedMember(repository, ACTOR, actorRole);
      await seedMember(repository, TARGET, 'viewer');
      const updateRole = jest.spyOn(repository, 'updateRole');
      const changeMemberRole = createChangeMemberRole(repository);

      const result = await changeMemberRole({
        workspaceId: WORKSPACE,
        actorUserId: ACTOR,
        targetUserId: TARGET,
        role: 'editor',
      });

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.kind).toBe('authorization');
        expect(result.error.code).toBe(ERROR_CODES.AUTH_FORBIDDEN);
      }
      expect(updateRole).not.toHaveBeenCalled();
    },
  );

  it('forbids an actor that is not a member of the workspace', async () => {
    const repository = new FakeMembershipRepository();
    await seedMember(repository, TARGET, 'viewer');
    await seedMember(repository, ACTOR, 'owner', OTHER_WORKSPACE);
    const changeMemberRole = createChangeMemberRole(repository);

    const result = await changeMemberRole({
      workspaceId: WORKSPACE,
      actorUserId: ACTOR,
      targetUserId: TARGET,
      role: 'editor',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('authorization');
      expect(result.error.code).toBe(ERROR_CODES.AUTH_FORBIDDEN);
    }
  });

  it('reports a notFound error when the target membership does not exist', async () => {
    const repository = new FakeMembershipRepository();
    await seedMember(repository, ACTOR, 'owner');
    const changeMemberRole = createChangeMemberRole(repository);

    const result = await changeMemberRole({
      workspaceId: WORKSPACE,
      actorUserId: ACTOR,
      targetUserId: TARGET,
      role: 'editor',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('notFound');
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND_RESOURCE);
    }
  });

  it('rejects an invalid role as invalid input without calling the repository', async () => {
    const repository = new FakeMembershipRepository();
    await seedMember(repository, ACTOR, 'owner');
    await seedMember(repository, TARGET, 'viewer');
    const updateRole = jest.spyOn(repository, 'updateRole');
    const changeMemberRole = createChangeMemberRole(repository);

    const result = await changeMemberRole({
      workspaceId: WORKSPACE,
      actorUserId: ACTOR,
      targetUserId: TARGET,
      role: 'admin' as MembershipRole,
    });

    expect(result.status).toBe('invalid-input');
    if (result.status === 'invalid-input') {
      expect(result.fieldErrors.role).toBeDefined();
    }
    expect(updateRole).not.toHaveBeenCalled();
  });

  it('preserves AppErrors thrown by the repository', async () => {
    const repository = new FakeMembershipRepository();
    await seedMember(repository, ACTOR, 'owner');
    await seedMember(repository, TARGET, 'viewer');
    jest.spyOn(repository, 'updateRole').mockRejectedValue({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
      message: 'Network request failed.',
    });
    const changeMemberRole = createChangeMemberRole(repository);

    const result = await changeMemberRole({
      workspaceId: WORKSPACE,
      actorUserId: ACTOR,
      targetUserId: TARGET,
      role: 'editor',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('network');
      expect(result.error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
    }
  });

  it('normalizes unexpected errors into an AppError', async () => {
    const repository = new FakeMembershipRepository();
    await seedMember(repository, ACTOR, 'owner');
    await seedMember(repository, TARGET, 'viewer');
    jest.spyOn(repository, 'updateRole').mockRejectedValue(new Error('socket hang up'));
    const changeMemberRole = createChangeMemberRole(repository);

    const result: ChangeMemberRoleResult = await changeMemberRole({
      workspaceId: WORKSPACE,
      actorUserId: ACTOR,
      targetUserId: TARGET,
      role: 'editor',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    }
  });
});
