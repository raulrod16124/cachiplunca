import type { UserSettings } from '../../domain/user-settings';
import type { UserSettingsRepository } from '../ports/user-settings-repository';

export type UpdateUserSettings = (settings: UserSettings) => Promise<UserSettings>;

export function createUpdateUserSettings(
  userSettingsRepository: UserSettingsRepository,
): UpdateUserSettings {
  return async (settings: UserSettings): Promise<UserSettings> => {
    return userSettingsRepository.upsert(settings);
  };
}
