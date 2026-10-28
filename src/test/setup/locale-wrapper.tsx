import { useEffect, type ReactElement, type ReactNode } from 'react';
import type {
  UserSettingsState,
  UserSettingsStore,
} from '../../application/services/user-settings-store';
import { UserSettings } from '../../domain/user-settings';
import { UserId } from '../../domain/shared/value-objects/user-id';
import { I18nProvider } from '../../presentation/i18n';
import { UserSettingsProvider } from '../../presentation/providers/user-settings-provider';

export type TestLocale = 'en' | 'es';

/**
 * Wraps a subject in the real `UserSettingsProvider` + `I18nProvider` pair with
 * an already-resolved settings snapshot, so tests can render in a fixed locale
 * without touching the loaded account preferences.
 */
export function localeWrapper(
  locale: TestLocale,
): (props: { children: ReactNode }) => ReactElement {
  const userId = UserId.create('locale-user');
  const settings = UserSettings.create({ userId, locale, theme: 'light' });
  const state: UserSettingsState = { status: 'ready', settings, error: null };
  const store: UserSettingsStore = {
    getSnapshot: () => state,
    subscribe: () => () => undefined,
    load: async () => undefined,
    update: async () => undefined,
  };

  return function LocaleWrapper({ children }: { readonly children: ReactNode }): ReactElement {
    useEffect(
      () => () => {
        const root = document.documentElement;
        root.removeAttribute('data-theme');
        root.removeAttribute('data-font-size');
        root.removeAttribute('data-reduced-motion');
        root.removeAttribute('lang');
      },
      [],
    );

    return (
      <UserSettingsProvider store={store} userId={userId}>
        <I18nProvider>{children}</I18nProvider>
      </UserSettingsProvider>
    );
  };
}
