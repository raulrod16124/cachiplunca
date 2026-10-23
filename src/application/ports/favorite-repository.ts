import type { Favorite } from '../../domain/favorite';
import type { UserId, WorkspaceId } from '../../domain/shared';

export interface FavoriteRepository {
  listByUser(userId: UserId): Promise<Favorite[]>;
  add(favorite: Favorite): Promise<Favorite>;
  remove(userId: UserId, workspaceId: WorkspaceId): Promise<void>;
}
