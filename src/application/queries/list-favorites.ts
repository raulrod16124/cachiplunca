import type { Favorite } from '../../domain/favorite';
import { UserId } from '../../domain/shared';
import { toAppError, type AppError } from '../../shared/errors';
import type { FavoriteRepository } from '../ports';

export type ListFavoritesResult =
  | { readonly status: 'ok'; readonly favorites: Favorite[] }
  | { readonly status: 'error'; readonly error: AppError };

export type ListFavorites = (userId: string) => Promise<ListFavoritesResult>;

export function sortFavoritesForList(favorites: readonly Favorite[]): Favorite[] {
  return [...favorites].sort(compareFavoritesForList);
}

function compareFavoritesForList(a: Favorite, b: Favorite): number {
  const createdDiff = b.createdAt.getTime() - a.createdAt.getTime();
  if (createdDiff !== 0) {
    return createdDiff;
  }

  if (a.workspaceId.value === b.workspaceId.value) {
    return 0;
  }
  return a.workspaceId.value < b.workspaceId.value ? -1 : 1;
}

export function createListFavorites(favoriteRepository: FavoriteRepository): ListFavorites {
  return async (userId: string): Promise<ListFavoritesResult> => {
    try {
      const favorites = await favoriteRepository.listByUser(UserId.create(userId));
      return { status: 'ok', favorites: sortFavoritesForList(favorites) };
    } catch (error) {
      return { status: 'error', error: toAppError(error) };
    }
  };
}
