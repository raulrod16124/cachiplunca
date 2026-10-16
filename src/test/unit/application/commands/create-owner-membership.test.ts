import {
  createCreateOwnerMembership,
  type CreateOwnerMembershipResult,
} from '../../../../application/commands';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeMembershipRepository } from '../../../fixtures/fake-membership-repository';

const USER = UserId.create('user-1');
const WORKSPACE = WorkspaceId.create('ws-1');
const INPUT = { userId: USER, workspaceId: WORKSPACE };

describe('createCreateOwnerMembership', () => {
  it('creates an owner membership for the given user and workspace', async () => {
    const repository = new FakeMembershipRepository();
    const createOwnerMembership = createCreateOwnerMembership(repository);

    const result = await createOwnerMembership(INPUT);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.membership.role).toBe('owner');
      expect(result.membership.isOwner()).toBe(true);
      expect(result.membership.userId.equals(USER)).toBe(true);
      expect(result.membership.workspaceId.equals(WORKSPACE)).toBe(true);
    }
    await expect(repository.findByUserAndWorkspace(USER, WORKSPACE)).resolves.toMatchObject({
      role: 'owner',
    });
  });

  it('propagates a duplicate membership as a conflict error', async () => {
    const repository = new FakeMembershipRepository();
    const createOwnerMembership = createCreateOwnerMembership(repository);

    await createOwnerMembership(INPUT);
    const result = await createOwnerMembership(INPUT);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('conflict');
      expect(result.error.code).toBe(ERROR_CODES.MEMBERSHIP_ALREADY_EXISTS);
    }
  });

  it('creates independent memberships for different owners of the same workspace', async () => {
    const repository = new FakeMembershipRepository();
    const createOwnerMembership = createCreateOwnerMembership(repository);
    const otherUser = UserId.create('user-2');

    await createOwnerMembership(INPUT);
    const result = await createOwnerMembership({ userId: otherUser, workspaceId: WORKSPACE });

    expect(result.status).toBe('ok');
    await expect(repository.listByWorkspace(WORKSPACE)).resolves.toHaveLength(2);
  });

  it('preserves AppErrors thrown by the repository', async () => {
    const repository = new FakeMembershipRepository();
    jest.spyOn(repository, 'create').mockRejectedValue({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
      message: 'Network request failed.',
    });
    const createOwnerMembership = createCreateOwnerMembership(repository);

    const result = await createOwnerMembership(INPUT);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('network');
      expect(result.error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
    }
  });

  it('normalizes unexpected errors into AppError', async () => {
    const repository = new FakeMembershipRepository();
    jest.spyOn(repository, 'create').mockRejectedValue(new Error('socket hang up'));
    const createOwnerMembership = createCreateOwnerMembership(repository);

    const result: CreateOwnerMembershipResult = await createOwnerMembership(INPUT);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    }
  });
});
