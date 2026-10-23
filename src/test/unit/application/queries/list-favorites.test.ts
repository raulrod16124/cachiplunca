import { createListFavorites, sortFavoritesForList } from '../../../../application/queries';
import { Favorite } from '../../../../domain/favorite';
import { UserId, WorkspaceId } from '../../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../../shared/errors';
import { FakeFavoriteRepository } from '../../../fixtures/fake-favorite-repository';

const USER = UserId.create('user-1');

function makeFavorite(workspaceId: string, createdAt: Date): Favorite {
  return Favorite.create({
    userId: USER,
    workspaceId: WorkspaceId.create(workspaceId),
    createdAt,
  });
}

describe('createListFavorites', () => {
  it('returns favorites ordered by creation descending', async () => {
    const repository = new FakeFavoriteRepository();
    const older = makeFavorite('ws-older', new Date('2026-10-20T10:00:00.000Z'));
    const newer = makeFavorite('ws-newer', new Date('2026-10-23T10:00:00.000Z'));
    await repository.add(older);
    await repository.add(newer);
    const listFavorites = createListFavorites(repository);

    const result = await listFavorites(USER.value);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.favorites.map((favorite) => favorite.workspaceId.value)).toEqual([
        'ws-newer',
        'ws-older',
      ]);
    }
  });

  it('returns an application error when the repository fails', async () => {
    const repository = new FakeFavoriteRepository();
    const error = createAppError('network', ERROR_CODES.NETWORK_REQUEST_FAILED, 'Network failed');
    jest.spyOn(repository, 'listByUser').mockRejectedValue(error);
    const listFavorites = createListFavorites(repository);

    const result = await listFavorites(USER.value);

    expect(result).toEqual({ status: 'error', error });
  });
});

describe('sortFavoritesForList', () => {
  it('breaks creation ties by workspace id', () => {
    const createdAt = new Date('2026-10-23T10:00:00.000Z');
    const sorted = sortFavoritesForList([
      makeFavorite('ws-b', createdAt),
      makeFavorite('ws-a', createdAt),
    ]);

    expect(sorted.map((favorite) => favorite.workspaceId.value)).toEqual(['ws-a', 'ws-b']);
  });
});
