import { UserId } from '../../domain/shared/value-objects/user-id';
import {
  UserSettings,
  type FontSize,
  type Locale,
  type ThemeMode,
} from '../../domain/user-settings';

export interface FirebaseUserSettingsDocument {
  readonly userId: string;
  readonly theme: ThemeMode;
  readonly fontSize: FontSize;
  readonly locale: Locale;
  readonly reducedMotion: boolean;
  readonly version: number;
  readonly updatedAt: string;
}

export function toUserSettingsDocument(settings: UserSettings): FirebaseUserSettingsDocument {
  const json = settings.toJSON();
  return {
    userId: json.userId,
    theme: json.theme,
    fontSize: json.fontSize,
    locale: json.locale,
    reducedMotion: json.reducedMotion,
    version: json.version,
    updatedAt: json.updatedAt,
  };
}

export function fromUserSettingsDocument(data: unknown): UserSettings | null {
  if (!isRecord(data)) {
    return null;
  }
  const userId = data.userId;
  const theme = data.theme;
  const fontSize = data.fontSize;
  const locale = data.locale;
  const reducedMotion = data.reducedMotion;
  const version = data.version;
  const updatedAt = data.updatedAt;

  if (typeof userId !== 'string' || userId.length === 0) {
    return null;
  }
  if (theme !== 'light' && theme !== 'dark' && theme !== 'system') {
    return null;
  }
  if (fontSize !== 'sm' && fontSize !== 'base' && fontSize !== 'lg' && fontSize !== 'xl') {
    return null;
  }
  if (locale !== 'es' && locale !== 'en' && locale !== 'system') {
    return null;
  }
  if (typeof reducedMotion !== 'boolean') {
    return null;
  }
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return null;
  }
  if (typeof updatedAt !== 'string') {
    return null;
  }
  const parsedDate = new Date(updatedAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  try {
    return UserSettings.fromPersistence({
      userId: UserId.create(userId),
      theme,
      fontSize,
      locale,
      reducedMotion,
      version,
      updatedAt: parsedDate,
    });
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
