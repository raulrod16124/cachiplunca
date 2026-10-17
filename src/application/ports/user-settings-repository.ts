import type { UserSettings } from '../../domain/user-settings';
import type { UserId } from '../../domain/shared/value-objects/user-id';

export interface UserSettingsRepository {
  getByUserId(userId: UserId): Promise<UserSettings | null>;
  upsert(settings: UserSettings): Promise<UserSettings>;
}
