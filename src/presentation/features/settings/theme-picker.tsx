import { Check, Monitor, Moon, Sun } from '@raulrod/icons';
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { ThemeMode } from '../../../domain/user-settings';
import { useI18n, type TranslationKey } from '../../i18n';

interface ThemeOption {
  readonly value: ThemeMode;
  readonly labelKey: TranslationKey;
  readonly descriptionKey: TranslationKey;
  readonly Icon: typeof Sun;
}

const THEME_OPTIONS: readonly ThemeOption[] = [
  {
    value: 'light',
    labelKey: 'settings.theme.light',
    descriptionKey: 'settings.theme.light.description',
    Icon: Sun,
  },
  {
    value: 'dark',
    labelKey: 'settings.theme.dark',
    descriptionKey: 'settings.theme.dark.description',
    Icon: Moon,
  },
  {
    value: 'system',
    labelKey: 'settings.theme.system',
    descriptionKey: 'settings.theme.system.description',
    Icon: Monitor,
  },
];

export interface ThemePickerProps {
  readonly value: ThemeMode;
  readonly onChange: (value: ThemeMode) => void;
  readonly disabled?: boolean;
  readonly labelledBy: string;
}

export function ThemePicker({
  value,
  onChange,
  disabled = false,
  labelledBy,
}: ThemePickerProps): ReactNode {
  const { t } = useI18n();
  const baseId = useId();
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    THEME_OPTIONS.findIndex((option) => option.value === value),
  );

  function moveTo(index: number): void {
    const option = THEME_OPTIONS[index];
    if (option === undefined) {
      return;
    }
    optionRefs.current[index]?.focus();
    if (option.value !== value) {
      onChange(option.value);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (disabled) {
      return;
    }

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        moveTo((index + 1) % THEME_OPTIONS.length);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        moveTo((index - 1 + THEME_OPTIONS.length) % THEME_OPTIONS.length);
        break;
      case 'Home':
        event.preventDefault();
        moveTo(0);
        break;
      case 'End':
        event.preventDefault();
        moveTo(THEME_OPTIONS.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="settings-theme-picker"
      data-testid="theme-picker"
    >
      {THEME_OPTIONS.map((option, index) => {
        const selected = option.value === value;
        const descriptionId = `${baseId}-${option.value}-description`;
        const Icon = option.Icon;

        return (
          <button
            key={option.value}
            ref={(node) => {
              optionRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t(option.labelKey)}
            aria-describedby={descriptionId}
            tabIndex={index === selectedIndex ? 0 : -1}
            disabled={disabled}
            className="settings-theme-option"
            data-testid={`theme-option-${option.value}`}
            onClick={() => {
              if (!selected) {
                onChange(option.value);
              }
            }}
            onKeyDown={(event) => {
              handleKeyDown(event, index);
            }}
          >
            <span
              className="settings-theme-option__preview"
              data-preview={option.value}
              aria-hidden="true"
            >
              <span className="settings-theme-option__preview-bar" />
              <span className="settings-theme-option__preview-bar settings-theme-option__preview-bar--short" />
            </span>
            <span className="settings-theme-option__heading">
              <span className="settings-theme-option__icon" aria-hidden="true">
                <Icon size={16} />
              </span>
              <span className="settings-theme-option__label">{t(option.labelKey)}</span>
              {selected ? (
                <Check
                  aria-hidden="true"
                  size={14}
                  className="settings-theme-option__check"
                  data-testid={`theme-option-check-${option.value}`}
                />
              ) : null}
            </span>
            <span id={descriptionId} className="settings-theme-option__description">
              {t(option.descriptionKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
