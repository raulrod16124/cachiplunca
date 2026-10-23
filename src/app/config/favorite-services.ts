import type { FavoriteServices } from '../../application/favorite-services';
import { createToggleFavorite } from '../../application/commands';
import { createListFavorites } from '../../application/queries';
import type { FavoriteRepository, MembershipRepository } from '../../application/ports';
import { createFirebaseFavoriteRepository } from '../../infrastructure/firebase/firebase-favorite-repository';
import { createFirebaseMembershipRepository } from '../../infrastructure/firebase/firebase-membership-repository';
import { getFirebaseFirestore } from '../../infrastructure/firebase/firebase-app';

export function createFavoriteServices(): FavoriteServices {
  const db = getFirebaseFirestore();
  const favoriteRepository: FavoriteRepository = createFirebaseFavoriteRepository(db);
  const membershipRepository: MembershipRepository = createFirebaseMembershipRepository(db);

  return {
    listFavorites: createListFavorites(favoriteRepository),
    toggleFavorite: createToggleFavorite({ favoriteRepository, membershipRepository }),
  };
}
