import { createLeaveWorkspace, type LeaveWorkspaceResult } from '../../../../application/commands';
import type { MembershipRole } from '../../../../domain/membership';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeMembershipRepository } from '../../../fixtures/fake-membership-repository';

const USER = UserId.create('user-1');
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

describe('createLeaveWorkspace', () => {
  it.each<MembershipRole>(['owner', 'editor', 'viewer'])(
    'lets a %s leave and deletes the membership',
    async (role) => {
      const repository = new FakeMembershipRepository();
      await seedMember(repository, USER, role);
      const leaveWorkspace = createLeaveWorkspace(repository);

      const result = await leaveWorkspace({ workspaceId: WORKSPACE, userId: USER });

      expect(result.status).toBe('ok');
      const stored = await repository.findByUserAndWorkspace(USER, WORKSPACE);
      expect(stored).toBeNull();
    },
  );

  it('forbids a user that is not a member without touching the repository', async () => {
    const repository = new FakeMembershipRepository();
    await seedMember(repository, USER, 'viewer', OTHER_WORKSPACE);
    const remove = jest.spyOn(repository, 'delete');
    const leaveWorkspace = createLeaveWorkspace(repository);

    const result = await leaveWorkspace({ workspaceId: WORKSPACE, userId: USER });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('authorization');
      expect(result.error.code).toBe(ERROR_CODES.AUTH_FORBIDDEN);
    }
    expect(remove).not.toHaveBeenCalled();
  });

  it('does not affect the same user membership in another workspace', async () => {
    const repository = new FakeMembershipRepository();
    await seedMember(repository, USER, 'editor');
    await seedMember(repository, USER, 'viewer', OTHER_WORKSPACE);
    const leaveWorkspace = createLeaveWorkspace(repository);

    const result = await leaveWorkspace({ workspaceId: WORKSPACE, userId: USER });

    expect(result.status).toBe('ok');
    expect(await repository.findByUserAndWorkspace(USER, WORKSPACE)).toBeNull();
    expect(await repository.findByUserAndWorkspace(USER, OTHER_WORKSPACE)).not.toBeNull();
  });

  it('preserves AppErrors thrown by the repository', async () => {
    const repository = new FakeMembershipRepository();
    await seedMember(repository, USER, 'owner');
    jest.spyOn(repository, 'delete').mockRejectedValue({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
      message: 'Network request failed.',
    });
    const leaveWorkspace = createLeaveWorkspace(repository);

    const result = await leaveWorkspace({ workspaceId: WORKSPACE, userId: USER });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('network');
      expect(result.error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
    }
  });

  it('normalizes unexpected errors into an AppError', async () => {
    const repository = new FakeMembershipRepository();
    await seedMember(repository, USER, 'owner');
    jest.spyOn(repository, 'delete').mockRejectedValue(new Error('socket hang up'));
    const leaveWorkspace = createLeaveWorkspace(repository);

    const result: LeaveWorkspaceResult = await leaveWorkspace({
      workspaceId: WORKSPACE,
      userId: USER,
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    }
  });
});
