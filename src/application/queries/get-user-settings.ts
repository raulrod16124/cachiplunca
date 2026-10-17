import type { UserId } from '../../domain/shared/value-objects/user-id';
import type { UserSettings } from '../../domain/user-settings';
import type { UserSettingsRepository } from '../ports/user-settings-repository';

export type GetUserSettings = (userId: UserId) => Promise<UserSettings | null>;

export function createGetUserSettings(
  userSettingsRepository: UserSettingsRepository,
): GetUserSettings {
  return async (userId: UserId): Promise<UserSettings | null> => {
    return userSettingsRepository.getByUserId(userId);
  };
}
