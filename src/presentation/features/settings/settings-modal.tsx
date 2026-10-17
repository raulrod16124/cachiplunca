import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  FormFieldControl,
  FormFieldLabel,
  Select,
  Stack,
  Switch,
  Text,
} from '@raulrod/ui';
import type { ReactNode } from 'react';
import type { FontSize, Locale, ThemeMode } from '../../../domain/user-settings';
import { useUserSettings } from '../../providers/user-settings-provider';

export interface SettingsModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const THEME_OPTIONS: readonly { readonly value: ThemeMode; readonly label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const FONT_SIZE_OPTIONS: readonly { readonly value: FontSize; readonly label: string }[] = [
  { value: 'sm', label: 'Small' },
  { value: 'base', label: 'Base' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra large' },
];

const LOCALE_OPTIONS: readonly { readonly value: Locale; readonly label: string }[] = [
  { value: 'system', label: 'System (browser)' },
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

export function SettingsModal({ open, onOpenChange }: SettingsModalProps): ReactNode {
  if (!open) {
    return null;
  }
  return <SettingsDialog onOpenChange={onOpenChange} />;
}

function SettingsDialog({
  onOpenChange,
}: {
  readonly onOpenChange: (open: boolean) => void;
}): ReactNode {
  const { settings, error, update } = useUserSettings();

  const theme = settings?.theme ?? 'system';
  const fontSize = settings?.fontSize ?? 'base';
  const locale = settings?.locale ?? 'system';
  const reducedMotion = settings?.reducedMotion ?? false;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Preferences apply to your whole account across every workspace.
          </DialogDescription>
        </DialogHeader>
        <Stack gap="space-4">
          <FormField>
            <FormFieldLabel>Theme</FormFieldLabel>
            <FormFieldControl>
              {(field) => (
                <Select
                  value={theme}
                  onValueChange={(value) => {
                    void update({ theme: value as ThemeMode });
                  }}
                >
                  <Select.Trigger {...field} aria-label="Theme">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {THEME_OPTIONS.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              )}
            </FormFieldControl>
          </FormField>

          <FormField>
            <FormFieldLabel>Font size</FormFieldLabel>
            <FormFieldControl>
              {(field) => (
                <Select
                  value={fontSize}
                  onValueChange={(value) => {
                    void update({ fontSize: value as FontSize });
                  }}
                >
                  <Select.Trigger {...field} aria-label="Font size">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {FONT_SIZE_OPTIONS.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              )}
            </FormFieldControl>
          </FormField>

          <FormField>
            <FormFieldLabel>Language</FormFieldLabel>
            <FormFieldControl>
              {(field) => (
                <Select
                  value={locale}
                  onValueChange={(value) => {
                    void update({ locale: value as Locale });
                  }}
                >
                  <Select.Trigger {...field} aria-label="Language">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {LOCALE_OPTIONS.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              )}
            </FormFieldControl>
          </FormField>

          <FormField>
            <FormFieldLabel>Reduce motion</FormFieldLabel>
            <FormFieldControl>
              {(field) => (
                <Switch
                  {...field}
                  checked={reducedMotion}
                  onChange={(event) => {
                    void update({ reducedMotion: event.target.checked });
                  }}
                />
              )}
            </FormFieldControl>
          </FormField>

          {settings === null ? (
            <Text color="color.text.muted" size="font.size.sm">
              Loading your preferences…
            </Text>
          ) : null}

          {error === null ? null : (
            <Text role="alert" color="color.text.danger" size="font.size.sm">
              We could not sync your preferences. They apply for now but might not persist across
              sessions.
            </Text>
          )}
        </Stack>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
