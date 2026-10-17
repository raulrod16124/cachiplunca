import type { Unsubscribe } from '../../shared/types';
import {
  UserSettings,
  type FontSize,
  type Locale,
  type ThemeMode,
} from '../../domain/user-settings';
import type { UserId } from '../../domain/shared/value-objects/user-id';
import type { UserSettingsRepository } from '../ports/user-settings-repository';

export type UserSettingsState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly settings: UserSettings }
  | { readonly status: 'error'; readonly error: Error };

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

function sameSettingsState(a: UserSettingsState, b: UserSettingsState): boolean {
  if (a.status !== b.status) {
    return false;
  }
  if (a.status === 'ready' && b.status === 'ready') {
    return a.settings.equals(b.settings);
  }
  if (a.status === 'error' && b.status === 'error') {
    return a.error === b.error;
  }
  return true;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function getSystemReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function detectBrowserLocale(): 'es' | 'en' {
  if (typeof navigator === 'undefined') {
    return 'en';
  }
  const languages = navigator.languages ?? [navigator.language];
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
      reducedMotion: getSystemReducedMotion(),
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
        publish({ status: 'ready', settings });
        await userSettingsRepository.upsert(settings);
        return;
      }
      currentSettings = stored;
      publish({ status: 'ready', settings: stored });
    } catch (error) {
      publish({ status: 'error', error: toError(error) });
    }
  }

  async function update(patch: UserSettingsPatch): Promise<void> {
    if (currentSettings === null || currentUserId === null) {
      return;
    }
    const next = currentSettings.update(patch);
    if (next === currentSettings) {
      return;
    }
    currentSettings = next;
    publish({ status: 'ready', settings: next });
    try {
      await userSettingsRepository.upsert(next);
    } catch (error) {
      publish({ status: 'error', error: toError(error) });
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

export function resolveLocale(locale: Locale): 'es' | 'en' {
  if (locale === 'system') {
    return detectBrowserLocale();
  }
  return locale;
}
