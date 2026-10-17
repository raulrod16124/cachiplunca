import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import type { UserSettingsRepository } from '../../application/ports/user-settings-repository';
import type { UserSettings } from '../../domain/user-settings';
import { UserId } from '../../domain/shared/value-objects/user-id';
import { createAppError, ERROR_CODES, isAppError, type AppError } from '../../shared/errors';
import { mapFirebaseError } from './firebase-error-mapper';
import { fromUserSettingsDocument, toUserSettingsDocument } from './firebase-user-settings-mapper';

const USER_SETTINGS_COLLECTION = 'user_settings';

export function createFirebaseUserSettingsRepository(db: Firestore): UserSettingsRepository {
  const userSettingsCollectionPath = USER_SETTINGS_COLLECTION;

  return {
    async getByUserId(userId: UserId): Promise<UserSettings | null> {
      const ref = doc(db, userSettingsCollectionPath, userId.value);
      const snapshot = await withMappedErrors(() => getDoc(ref));
      if (!snapshot.exists()) {
        return null;
      }
      const settings = fromUserSettingsDocument(snapshot.data());
      if (settings === null) {
        throw toValidationError('Invalid user settings document');
      }
      return settings;
    },
    async upsert(settings: UserSettings): Promise<UserSettings> {
      const validated = assertValidUserSettings(settings);
      const document = toUserSettingsDocument(validated);
      const ref = doc(db, userSettingsCollectionPath, validated.userId.value);
      await withMappedErrors(() => setDoc(ref, document, { merge: true }));
      return validated;
    },
  };
}

function assertValidUserSettings(settings: UserSettings): UserSettings {
  try {
    // domain already validated; return as-is
    return settings;
  } catch (error) {
    throw toValidationError(error);
  }
}

function toValidationError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  const message =
    error instanceof Error && error.message.length > 0
      ? error.message
      : 'Invalid user settings input.';
  return createAppError('validation', ERROR_CODES.VALIDATION_INVALID_INPUT, message, {
    cause: error,
  });
}

async function withMappedErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapFirebaseError(error);
  }
}
