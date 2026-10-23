import { createToggleFavorite } from '../../../../application/commands';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeFavoriteRepository } from '../../../fixtures/fake-favorite-repository';
import { FakeMembershipRepository } from '../../../fixtures/fake-membership-repository';

const USER = UserId.create('user-1');
const WORKSPACE = WorkspaceId.create('ws-1');

function createDependencies(): {
  favoriteRepository: FakeFavoriteRepository;
  membershipRepository: FakeMembershipRepository;
} {
  return {
    favoriteRepository: new FakeFavoriteRepository(),
    membershipRepository: new FakeMembershipRepository(),
  };
}

describe('createToggleFavorite', () => {
  it('adds a favorite when the user is a member', async () => {
    const { favoriteRepository, membershipRepository } = createDependencies();
    await membershipRepository.create({ userId: USER, workspaceId: WORKSPACE, role: 'viewer' });
    const toggleFavorite = createToggleFavorite({ favoriteRepository, membershipRepository });

    const result = await toggleFavorite({
      userId: USER.value,
      workspaceId: WORKSPACE.value,
      favorited: true,
    });

    expect(result).toEqual({ status: 'ok', favorited: true });
    expect((await favoriteRepository.listByUser(USER)).length).toBe(1);
  });

  it('removes an existing favorite', async () => {
    const { favoriteRepository, membershipRepository } = createDependencies();
    await membershipRepository.create({ userId: USER, workspaceId: WORKSPACE, role: 'owner' });
    const toggleFavorite = createToggleFavorite({ favoriteRepository, membershipRepository });

    await toggleFavorite({
      userId: USER.value,
      workspaceId: WORKSPACE.value,
      favorited: true,
    });
    const result = await toggleFavorite({
      userId: USER.value,
      workspaceId: WORKSPACE.value,
      favorited: false,
    });

    expect(result).toEqual({ status: 'ok', favorited: false });
    await expect(favoriteRepository.listByUser(USER)).resolves.toEqual([]);
  });

  it('rejects a workspace where the user is not a member', async () => {
    const { favoriteRepository, membershipRepository } = createDependencies();
    const toggleFavorite = createToggleFavorite({ favoriteRepository, membershipRepository });

    const result = await toggleFavorite({
      userId: USER.value,
      workspaceId: WORKSPACE.value,
      favorited: true,
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.code).toBe(ERROR_CODES.AUTH_FORBIDDEN);
    }
    await expect(favoriteRepository.listByUser(USER)).resolves.toEqual([]);
  });

  it('returns field errors for empty input', async () => {
    const { favoriteRepository, membershipRepository } = createDependencies();
    const toggleFavorite = createToggleFavorite({ favoriteRepository, membershipRepository });

    const result = await toggleFavorite({ userId: ' ', workspaceId: '', favorited: true });

    expect(result.status).toBe('invalid-input');
    if (result.status === 'invalid-input') {
      expect(result.fieldErrors.userId).toBeDefined();
      expect(result.fieldErrors.workspaceId).toBeDefined();
    }
  });

  it('returns a field error when favorited is not a boolean', async () => {
    const { favoriteRepository, membershipRepository } = createDependencies();
    const toggleFavorite = createToggleFavorite({ favoriteRepository, membershipRepository });

    const result = await toggleFavorite({
      userId: USER.value,
      workspaceId: WORKSPACE.value,
      favorited: 'yes' as unknown as boolean,
    });

    expect(result.status).toBe('invalid-input');
    if (result.status === 'invalid-input') {
      expect(result.fieldErrors.favorited).toBeDefined();
    }
  });

  it('maps repository errors to an application error', async () => {
    const { favoriteRepository, membershipRepository } = createDependencies();
    await membershipRepository.create({ userId: USER, workspaceId: WORKSPACE, role: 'owner' });
    jest.spyOn(favoriteRepository, 'add').mockRejectedValue(new Error('offline'));
    const toggleFavorite = createToggleFavorite({ favoriteRepository, membershipRepository });

    const result = await toggleFavorite({
      userId: USER.value,
      workspaceId: WORKSPACE.value,
      favorited: true,
    });

    expect(result.status).toBe('error');
  });
});
