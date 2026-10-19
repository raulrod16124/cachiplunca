import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Locale } from '../../domain/user-settings';
import { useUserSettings } from '../providers/user-settings-provider';
import { MESSAGES, type AppLocale, type TranslationKey } from './messages';

export type TranslationParams = Readonly<Record<string, string | number>>;

export interface I18nContextValue {
  readonly locale: AppLocale;
  readonly t: (key: TranslationKey, params?: TranslationParams) => string;
}

const DEFAULT_I18N: I18nContextValue = {
  locale: 'en',
  t: translate.bind(null, 'en'),
};

const I18nContext = createContext<I18nContextValue>(DEFAULT_I18N);

export function translate(
  locale: AppLocale,
  key: TranslationKey,
  params: TranslationParams = {},
): string {
  const template = MESSAGES[locale][key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function resolveLocale(
  locale: Locale | null | undefined,
  languages: readonly string[] = [],
): AppLocale {
  if (locale === 'es' || locale === 'en') {
    return locale;
  }

  const preferred = languages[0]?.toLowerCase() ?? '';
  return preferred.startsWith('es') ? 'es' : 'en';
}

function systemLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') {
    return [];
  }
  return [...(navigator.languages ?? []), navigator.language].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
}

export interface I18nProviderProps {
  readonly children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps): ReactNode {
  const { settings } = useUserSettings();
  const locale = resolveLocale(settings?.locale, systemLanguages());

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: (key, params) => translate(locale, key, params),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
