import {
  FormField,
  FormFieldControl,
  FormFieldDescription,
  FormFieldLabel,
  Select,
  Stack,
  Switch,
  Text,
} from '@raulrod/ui';
import type { ReactNode } from 'react';
import type { FontSize, Locale, ThemeMode } from '../../../domain/user-settings';
import { useI18n, type TranslationKey } from '../../i18n';
import { useUserSettings } from '../../providers/user-settings-provider';

const THEME_OPTIONS: readonly { readonly value: ThemeMode; readonly label: TranslationKey }[] = [
  { value: 'system', label: 'settings.theme.system' },
  { value: 'light', label: 'settings.theme.light' },
  { value: 'dark', label: 'settings.theme.dark' },
];

const FONT_SIZE_OPTIONS: readonly { readonly value: FontSize; readonly label: TranslationKey }[] = [
  { value: 'sm', label: 'settings.fontSize.sm' },
  { value: 'base', label: 'settings.fontSize.base' },
  { value: 'lg', label: 'settings.fontSize.lg' },
  { value: 'xl', label: 'settings.fontSize.xl' },
];

const LOCALE_OPTIONS: readonly { readonly value: Locale; readonly label: TranslationKey }[] = [
  { value: 'system', label: 'settings.language.system' },
  { value: 'es', label: 'settings.language.es' },
  { value: 'en', label: 'settings.language.en' },
];

const SELECT_CLASS_NAMES = { content: 'settings-select-content' } as const;

export function SettingsControls(): ReactNode {
  const { settings, error, update } = useUserSettings();
  const { t } = useI18n();

  const theme = settings?.theme ?? 'system';
  const fontSize = settings?.fontSize ?? 'base';
  const locale = settings?.locale ?? 'system';
  const reducedMotion = settings?.reducedMotion ?? false;
  const isLoading = settings === null;

  return (
    <Stack gap="space-4">
      <FormField>
        <FormFieldLabel>{t('settings.theme')}</FormFieldLabel>
        <FormFieldDescription>{t('settings.theme.hint')}</FormFieldDescription>
        <FormFieldControl>
          {(field) => (
            <Select
              value={theme}
              classNames={SELECT_CLASS_NAMES}
              onValueChange={(value) => {
                void update({ theme: value as ThemeMode });
              }}
            >
              <Select.Trigger {...field} aria-label={t('settings.theme')} disabled={isLoading}>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {THEME_OPTIONS.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {t(option.label)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          )}
        </FormFieldControl>
      </FormField>

      <FormField>
        <FormFieldLabel>{t('settings.fontSize')}</FormFieldLabel>
        <FormFieldDescription>{t('settings.fontSize.hint')}</FormFieldDescription>
        <FormFieldControl>
          {(field) => (
            <Select
              value={fontSize}
              classNames={SELECT_CLASS_NAMES}
              onValueChange={(value) => {
                void update({ fontSize: value as FontSize });
              }}
            >
              <Select.Trigger {...field} aria-label={t('settings.fontSize')} disabled={isLoading}>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {FONT_SIZE_OPTIONS.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {t(option.label)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          )}
        </FormFieldControl>
      </FormField>

      <FormField>
        <FormFieldLabel>{t('settings.language')}</FormFieldLabel>
        <FormFieldDescription>{t('settings.language.hint')}</FormFieldDescription>
        <FormFieldControl>
          {(field) => (
            <Select
              value={locale}
              classNames={SELECT_CLASS_NAMES}
              onValueChange={(value) => {
                void update({ locale: value as Locale });
              }}
            >
              <Select.Trigger {...field} aria-label={t('settings.language')} disabled={isLoading}>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {LOCALE_OPTIONS.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {t(option.label)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          )}
        </FormFieldControl>
      </FormField>

      <FormField>
        <FormFieldLabel>{t('settings.reduceMotion')}</FormFieldLabel>
        <FormFieldDescription>{t('settings.reduceMotion.hint')}</FormFieldDescription>
        <FormFieldControl>
          {(field) => (
            <Switch
              {...field}
              checked={reducedMotion}
              disabled={isLoading}
              onChange={(event) => {
                void update({ reducedMotion: event.target.checked });
              }}
            />
          )}
        </FormFieldControl>
      </FormField>

      {settings === null ? (
        <Text color="color.text.muted" size="font.size.sm">
          {t('settings.loading')}
        </Text>
      ) : null}

      {error === null ? null : (
        <Text role="alert" color="color.text.danger" size="font.size.sm">
          {t('settings.syncError')}
        </Text>
      )}
    </Stack>
  );
}
