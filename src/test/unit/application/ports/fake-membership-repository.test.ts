import { FakeMembershipRepository } from '../../../fixtures/fake-membership-repository';
import { describeMembershipRepositoryContract } from '../../../contract/membership-repository-contract';
import { UserId, WorkspaceId } from '../../../../domain/shared';

describe('FakeMembershipRepository', () => {
  describeMembershipRepositoryContract('membership repository contract', () => {
    return new FakeMembershipRepository();
  });

  it('returns the stored instance from find and listings', async () => {
    const repository = new FakeMembershipRepository();
    const userId = UserId.create('user-1');
    const workspaceId = WorkspaceId.create('ws-1');

    const created = await repository.create({ userId, workspaceId, role: 'owner' });

    expect(await repository.findByUserAndWorkspace(userId, workspaceId)).toBe(created);
    expect(await repository.listByWorkspace(workspaceId)).toEqual([created]);
    expect(await repository.listByUser(userId)).toEqual([created]);
  });

  it('keeps instances independent from each other', async () => {
    const first = new FakeMembershipRepository();
    const second = new FakeMembershipRepository();

    await first.create({
      userId: UserId.create('user-1'),
      workspaceId: WorkspaceId.create('ws-1'),
      role: 'owner',
    });

    await expect(second.listByWorkspace(WorkspaceId.create('ws-1'))).resolves.toEqual([]);
  });
});
