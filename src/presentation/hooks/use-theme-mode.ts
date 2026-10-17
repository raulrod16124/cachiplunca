import { useEffect, useMemo } from 'react';
import { useUserSettings } from '../providers/user-settings-provider';
import { resolveLocale } from '../../application/services/user-settings-store';

export interface ThemeModeResult {
  readonly resolvedTheme: 'light' | 'dark';
  readonly effectiveLocale: 'es' | 'en';
}

/**
 * Reads the current user theme/locale preferences and keeps the document in
 * sync: `data-theme` on `<html>` drives the `@raulrod/tokens` light/dark
 * custom properties (including live OS changes when the mode is `system`),
 * and `lang` reflects the resolved locale. Must be rendered inside a
 * `UserSettingsProvider`.
 */
export function useThemeMode(): ThemeModeResult {
  const { settings } = useUserSettings();

  useEffect(() => {
    const root = document.documentElement;
    if (settings === null) {
      root.removeAttribute('data-theme');
      return;
    }

    if (settings.theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const apply = (): void => {
        root.setAttribute('data-theme', media.matches ? 'dark' : 'light');
      };
      apply();
      media.addEventListener('change', apply);
      return () => {
        media.removeEventListener('change', apply);
      };
    }

    root.setAttribute('data-theme', settings.theme);
    return undefined;
  }, [settings]);

  useEffect(() => {
    if (settings === null) {
      return;
    }
    document.documentElement.setAttribute('lang', resolveLocale(settings.locale));
  }, [settings]);

  return useMemo(() => {
    if (settings === null) {
      return { resolvedTheme: 'light' as const, effectiveLocale: 'en' as const };
    }
    const media =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;
    return {
      resolvedTheme:
        settings.theme === 'system' ? (media?.matches ? 'dark' : 'light') : settings.theme,
      effectiveLocale: resolveLocale(settings.locale),
    };
  }, [settings]);
}
