import { createGetWorkspaceRole } from '../../../../application/queries';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { FakeMembershipRepository } from '../../../fixtures/fake-membership-repository';

describe('createGetWorkspaceRole', () => {
  it('returns the role when the membership exists', async () => {
    const repository = new FakeMembershipRepository();
    await repository.create({
      userId: UserId.create('user-1'),
      workspaceId: WorkspaceId.create('ws-1'),
      role: 'editor',
    });

    const getWorkspaceRole = createGetWorkspaceRole(repository);
    const result = await getWorkspaceRole('user-1', 'ws-1');

    expect(result).toEqual({ status: 'ok', role: 'editor' });
  });

  it('returns notFound when the user is not a member of the workspace', async () => {
    const repository = new FakeMembershipRepository();
    const getWorkspaceRole = createGetWorkspaceRole(repository);

    const result = await getWorkspaceRole('user-1', 'ws-1');

    expect(result).toEqual({ status: 'notFound' });
  });

  it('returns an error when the repository fails', async () => {
    const repository = new FakeMembershipRepository();
    jest
      .spyOn(repository, 'findByUserAndWorkspace')
      .mockRejectedValueOnce(new Error('Database unavailable'));

    const getWorkspaceRole = createGetWorkspaceRole(repository);
    const result = await getWorkspaceRole('user-1', 'ws-1');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.message).toBe('Database unavailable');
    }
  });

  it('returns an error for an invalid user id', async () => {
    const repository = new FakeMembershipRepository();
    const getWorkspaceRole = createGetWorkspaceRole(repository);

    const result = await getWorkspaceRole('   ', 'ws-1');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.message).toBe('UserId cannot be empty');
    }
  });
});
