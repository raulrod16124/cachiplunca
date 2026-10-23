import type { FavoriteRepository } from '../../application/ports';
import type { Favorite } from '../../domain/favorite';
import type { UserId, WorkspaceId } from '../../domain/shared';

export class FakeFavoriteRepository implements FavoriteRepository {
  #favorites = new Map<string, Favorite>();

  async listByUser(userId: UserId): Promise<Favorite[]> {
    return [...this.#favorites.values()].filter((favorite) => favorite.userId.equals(userId));
  }

  async add(favorite: Favorite): Promise<Favorite> {
    this.#favorites.set(favorite.id.value, favorite);
    return favorite;
  }

  async remove(userId: UserId, workspaceId: WorkspaceId): Promise<void> {
    this.#favorites.delete(keyOf(userId, workspaceId));
  }

  list(): Favorite[] {
    return [...this.#favorites.values()];
  }
}

function keyOf(userId: UserId, workspaceId: WorkspaceId): string {
  return `${userId.value}_${workspaceId.value}`;
}
