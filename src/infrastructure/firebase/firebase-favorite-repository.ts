import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { FavoriteRepository } from '../../application/ports/favorite-repository';
import type { Favorite } from '../../domain/favorite';
import type { UserId, WorkspaceId } from '../../domain/shared';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';
import { mapFirebaseError } from './firebase-error-mapper';
import { fromFavoriteDocument, toFavoriteDocument } from './firebase-favorite-mapper';

const FAVORITES_COLLECTION = 'favorites';

export function createFirebaseFavoriteRepository(db: Firestore): FavoriteRepository {
  const favoritesCollection = collection(db, FAVORITES_COLLECTION);

  return {
    async listByUser(userId: UserId): Promise<Favorite[]> {
      const snapshot = await withMappedErrors(() =>
        getDocs(query(favoritesCollection, where('userId', '==', userId.value))),
      );
      return snapshot.docs.map((document) =>
        readFavorite(() => fromFavoriteDocument(document.id, document.data())),
      );
    },

    async add(favorite: Favorite): Promise<Favorite> {
      await withMappedErrors(() =>
        setDoc(doc(db, FAVORITES_COLLECTION, favorite.id.value), toFavoriteDocument(favorite)),
      );
      return favorite;
    },

    async remove(userId: UserId, workspaceId: WorkspaceId): Promise<void> {
      await withMappedErrors(() =>
        deleteDoc(doc(db, FAVORITES_COLLECTION, `${userId.value}_${workspaceId.value}`)),
      );
    },
  };
}

function readFavorite(build: () => Favorite): Favorite {
  try {
    return build();
  } catch (error) {
    throw toValidationError(error);
  }
}

async function withMappedErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapFirebaseError(error);
  }
}

function toValidationError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  const message =
    error instanceof Error && error.message.length > 0 ? error.message : 'Invalid favorite input.';
  return createAppError('validation', ERROR_CODES.VALIDATION_INVALID_INPUT, message, {
    cause: error,
  });
}
