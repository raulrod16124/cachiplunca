import type { Firestore } from 'firebase/firestore';
import { createGetUserSettings, type GetUserSettings } from '../../application/queries';
import { createUpdateUserSettings, type UpdateUserSettings } from '../../application/commands';
import { createUserSettingsStore, type UserSettingsStore } from '../../application/services';
import { createFirebaseUserSettingsRepository } from '../../infrastructure/firebase/firebase-user-settings-repository';
import { createBrowserSystemEnvironment } from '../../infrastructure/browser/system-environment';

export interface UserSettingsServices {
  readonly userSettingsRepository: ReturnType<typeof createFirebaseUserSettingsRepository>;
  readonly getUserSettings: GetUserSettings;
  readonly updateUserSettings: UpdateUserSettings;
  readonly userSettingsStore: UserSettingsStore;
}

export function createUserSettingsServices(db: Firestore): UserSettingsServices {
  const userSettingsRepository = createFirebaseUserSettingsRepository(db);
  return {
    userSettingsRepository,
    getUserSettings: createGetUserSettings(userSettingsRepository),
    updateUserSettings: createUpdateUserSettings(userSettingsRepository),
    userSettingsStore: createUserSettingsStore(
      userSettingsRepository,
      createBrowserSystemEnvironment(),
    ),
  };
}
