import type { Unsubscribe } from '../../shared/types';
import {
  UserSettings,
  type FontSize,
  type Locale,
  type ThemeMode,
} from '../../domain/user-settings';
import type { UserId } from '../../domain/shared/value-objects/user-id';
import type { UserSettingsRepository } from '../ports/user-settings-repository';
import type { SystemEnvironment } from '../ports/system-environment';

export type UserSettingsState =
  | { readonly status: 'loading' }
  | {
      readonly status: 'ready';
      readonly settings: UserSettings;
      readonly error: Error | null;
    };

export interface UserSettingsPatch {
  readonly theme?: ThemeMode;
  readonly fontSize?: FontSize;
  readonly locale?: Locale;
  readonly reducedMotion?: boolean;
}

export interface UserSettingsStore {
  readonly getSnapshot: () => UserSettingsState;
  readonly subscribe: (onChange: () => void) => Unsubscribe;
  readonly load: (userId: UserId) => Promise<void>;
  readonly update: (patch: UserSettingsPatch) => Promise<void>;
}

const LOADING_STATE: UserSettingsState = { status: 'loading' };

function sameError(a: Error | null, b: Error | null): boolean {
  if (a === b) {
    return true;
  }
  if (a === null || b === null) {
    return false;
  }
  return a.message === b.message;
}

function sameSettingsState(a: UserSettingsState, b: UserSettingsState): boolean {
  if (a.status !== b.status) {
    return false;
  }
  if (a.status === 'ready' && b.status === 'ready') {
    return a.settings.equals(b.settings) && sameError(a.error, b.error);
  }
  return true;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function detectLocale(languages: readonly string[]): 'es' | 'en' {
  for (const lang of languages) {
    if (typeof lang !== 'string' || lang.length === 0) {
      continue;
    }
    const normalized = lang.toLowerCase().slice(0, 2);
    if (normalized === 'es') {
      return 'es';
    }
    if (normalized === 'en') {
      return 'en';
    }
  }
  return 'en';
}

export function createUserSettingsStore(
  userSettingsRepository: UserSettingsRepository,
  systemEnvironment: SystemEnvironment,
): UserSettingsStore {
  const listeners = new Set<() => void>();
  let snapshot: UserSettingsState = LOADING_STATE;
  let currentUserId: UserId | null = null;
  let currentSettings: UserSettings | null = null;

  function publish(next: UserSettingsState): void {
    if (sameSettingsState(snapshot, next)) {
      return;
    }
    snapshot = next;
    for (const listener of listeners) {
      listener();
    }
  }

  function defaultSettings(userId: UserId): UserSettings {
    return UserSettings.create({
      userId,
      theme: 'system',
      fontSize: 'base',
      locale: 'system',
      reducedMotion: systemEnvironment.getReducedMotionPref(),
    });
  }

  async function load(userId: UserId): Promise<void> {
    currentUserId = userId;
    currentSettings = null;
    publish(LOADING_STATE);
    try {
      const stored = await userSettingsRepository.getByUserId(userId);
      if (stored === null) {
        const settings = defaultSettings(userId);
        currentSettings = settings;
        publish({ status: 'ready', settings, error: null });
        try {
          await userSettingsRepository.upsert(settings);
        } catch (error) {
          publish({ status: 'ready', settings, error: toError(error) });
        }
        return;
      }
      currentSettings = stored;
      publish({ status: 'ready', settings: stored, error: null });
    } catch (error) {
      // A read failure (e.g. offline or missing permissions) must not drop the
      // settings entirely: fall back to defaults so the theme still applies and
      // the user can keep adjusting preferences, surfacing the error alongside.
      const settings = defaultSettings(userId);
      currentSettings = settings;
      publish({ status: 'ready', settings, error: toError(error) });
    }
  }

  async function update(patch: UserSettingsPatch): Promise<void> {
    if (currentSettings === null || currentUserId === null) {
      return;
    }
    const previous = currentSettings;
    const next = previous.update(patch);
    if (next === previous) {
      return;
    }
    currentSettings = next;
    publish({ status: 'ready', settings: next, error: null });
    try {
      await userSettingsRepository.upsert(next);
    } catch (error) {
      // Keep the optimistic choice visible and surface the persistence failure
      // instead of dropping the settings. A later change re-persists the whole
      // document, so the preference recovers once persistence works again.
      publish({ status: 'ready', settings: next, error: toError(error) });
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(onChange) {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    load,
    update,
  };
}

export function resolveLocale(locale: Locale, languages: readonly string[]): 'es' | 'en' {
  if (locale === 'system') {
    return detectLocale(languages);
  }
  return locale;
}
