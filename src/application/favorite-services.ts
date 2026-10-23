import type { ToggleFavorite } from './commands';
import type { ListFavorites } from './queries';

export interface FavoriteServices {
  readonly listFavorites: ListFavorites;
  readonly toggleFavorite: ToggleFavorite;
}
