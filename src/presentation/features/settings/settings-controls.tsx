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
import { Accessibility, Languages, Palette } from '@raulrod/icons';
import { useId, type ReactNode } from 'react';
import styled from 'styled-components';
import type { FontSize } from '../../../domain/user-settings';
import { useI18n, type TranslationKey } from '../../i18n';
import { useUserSettings } from '../../providers/user-settings-provider';
import {
  StitchPanel,
  StitchSection,
  StitchSectionHeading,
  StitchSectionIcon,
  StitchSectionTitle,
} from '../../components/stitch-page-shell';
import { LanguagePicker } from './language-picker';
import { ThemePicker } from './theme-picker';

const FONT_SIZE_OPTIONS: readonly { readonly value: FontSize; readonly label: TranslationKey }[] = [
  { value: 'sm', label: 'settings.fontSize.sm' },
  { value: 'base', label: 'settings.fontSize.base' },
  { value: 'lg', label: 'settings.fontSize.lg' },
  { value: 'xl', label: 'settings.fontSize.xl' },
];

const SELECT_CLASS_NAMES = { content: 'settings-select-content' } as const;

const Fields = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]};
`;

const SettingField = styled(FormField)`
  && {
    padding: ${({ theme }) => theme.space[4]};
    border: 1px solid var(--stitch-border-soft);
    border-radius: var(--stitch-radius-control);
    background: var(--stitch-surface-low);
  }

  && .rr-form-field-label {
    color: var(--stitch-text);
    font-weight: ${({ theme }) => theme.font.weight.semibold};
  }

  && .rr-form-field-description {
    color: var(--stitch-text-muted);
  }
`;

const FieldLabel = styled.span`
  color: var(--stitch-text);
  font-weight: ${({ theme }) => theme.font.weight.semibold};
`;

export function SettingsControls(): ReactNode {
  const { settings, error, update } = useUserSettings();
  const { t } = useI18n();
  const themeLabelId = useId();
  const languageLabelId = useId();

  const theme = settings?.theme ?? 'system';
  const fontSize = settings?.fontSize ?? 'base';
  const locale = settings?.locale ?? 'system';
  const reducedMotion = settings?.reducedMotion ?? false;
  const isLoading = settings === null;

  return (
    <Stack gap="space-4">
      <StitchPanel>
        <StitchSection>
          <StitchSectionHeading>
            <StitchSectionIcon>
              <Palette aria-hidden="true" size={16} />
            </StitchSectionIcon>
            <StitchSectionTitle as="h2">{t('settings.section.appearance')}</StitchSectionTitle>
          </StitchSectionHeading>

          <Fields>
            <SettingField>
              <FieldLabel id={themeLabelId}>{t('settings.theme')}</FieldLabel>
              <ThemePicker
                value={theme}
                disabled={isLoading}
                labelledBy={themeLabelId}
                onChange={(value) => {
                  void update({ theme: value });
                }}
              />
            </SettingField>

            <SettingField>
              <FormFieldLabel>{t('settings.fontSize')}</FormFieldLabel>
              <FormFieldControl>
                {(field) => (
                  <Select
                    value={fontSize}
                    classNames={SELECT_CLASS_NAMES}
                    onValueChange={(value) => {
                      void update({ fontSize: value as FontSize });
                    }}
                  >
                    <Select.Trigger
                      {...field}
                      aria-label={t('settings.fontSize')}
                      disabled={isLoading}
                    >
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
            </SettingField>
          </Fields>
        </StitchSection>

        <StitchSection>
          <StitchSectionHeading>
            <StitchSectionIcon>
              <Languages aria-hidden="true" size={16} />
            </StitchSectionIcon>
            <StitchSectionTitle as="h2">{t('settings.section.language')}</StitchSectionTitle>
          </StitchSectionHeading>

          <Fields>
            <SettingField>
              <FieldLabel id={languageLabelId}>{t('settings.language')}</FieldLabel>
              <LanguagePicker
                value={locale}
                disabled={isLoading}
                labelledBy={languageLabelId}
                onChange={(value) => {
                  void update({ locale: value });
                }}
              />
            </SettingField>
          </Fields>
        </StitchSection>

        <StitchSection>
          <StitchSectionHeading>
            <StitchSectionIcon>
              <Accessibility aria-hidden="true" size={16} />
            </StitchSectionIcon>
            <StitchSectionTitle as="h2">{t('settings.section.accessibility')}</StitchSectionTitle>
          </StitchSectionHeading>

          <Fields>
            <SettingField>
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
            </SettingField>
          </Fields>
        </StitchSection>
      </StitchPanel>

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
