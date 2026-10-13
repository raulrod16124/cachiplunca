import { createRemoveMember, type RemoveMemberResult } from '../../../../application/commands';
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

describe('createRemoveMember', () => {
  it('lets an owner remove another member and deletes the membership', async () => {
    const repository = new FakeMembershipRepository();
    await seedMember(repository, ACTOR, 'owner');
    await seedMember(repository, TARGET, 'viewer');
    const removeMember = createRemoveMember(repository);

    const result = await removeMember({
      workspaceId: WORKSPACE,
      actorUserId: ACTOR,
      targetUserId: TARGET,
    });

    expect(result.status).toBe('ok');
    const stored = await repository.findByUserAndWorkspace(TARGET, WORKSPACE);
    expect(stored).toBeNull();
  });

  it.each<MembershipRole>(['editor', 'viewer'])(
    'forbids a %s from removing a member without touching the repository',
    async (actorRole) => {
      const repository = new FakeMembershipRepository();
      await seedMember(repository, ACTOR, actorRole);
      await seedMember(repository, TARGET, 'viewer');
      const remove = jest.spyOn(repository, 'delete');
      const removeMember = createRemoveMember(repository);

      const result = await removeMember({
        workspaceId: WORKSPACE,
        actorUserId: ACTOR,
        targetUserId: TARGET,
      });

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.kind).toBe('authorization');
        expect(result.error.code).toBe(ERROR_CODES.AUTH_FORBIDDEN);
      }
      expect(remove).not.toHaveBeenCalled();
    },
  );

  it('forbids an actor that is not a member of the workspace', async () => {
    const repository = new FakeMembershipRepository();
    await seedMember(repository, TARGET, 'viewer');
    await seedMember(repository, ACTOR, 'owner', OTHER_WORKSPACE);
    const removeMember = createRemoveMember(repository);

    const result = await removeMember({
      workspaceId: WORKSPACE,
      actorUserId: ACTOR,
      targetUserId: TARGET,
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
    const removeMember = createRemoveMember(repository);

    const result = await removeMember({
      workspaceId: WORKSPACE,
      actorUserId: ACTOR,
      targetUserId: TARGET,
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('notFound');
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND_RESOURCE);
    }
  });

  it('preserves AppErrors thrown by the repository', async () => {
    const repository = new FakeMembershipRepository();
    await seedMember(repository, ACTOR, 'owner');
    await seedMember(repository, TARGET, 'viewer');
    jest.spyOn(repository, 'delete').mockRejectedValue({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
      message: 'Network request failed.',
    });
    const removeMember = createRemoveMember(repository);

    const result = await removeMember({
      workspaceId: WORKSPACE,
      actorUserId: ACTOR,
      targetUserId: TARGET,
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
    jest.spyOn(repository, 'delete').mockRejectedValue(new Error('socket hang up'));
    const removeMember = createRemoveMember(repository);

    const result: RemoveMemberResult = await removeMember({
      workspaceId: WORKSPACE,
      actorUserId: ACTOR,
      targetUserId: TARGET,
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    }
  });
});
