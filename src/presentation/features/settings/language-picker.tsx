import { Check, Globe } from '@raulrod/icons';
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { Locale } from '../../../domain/user-settings';
import { useI18n, type TranslationKey } from '../../i18n';

interface LanguageOption {
  readonly value: Locale;
  readonly labelKey: TranslationKey;
  readonly descriptionKey: TranslationKey;
  readonly translatedKey?: TranslationKey;
  readonly flag?: string;
}

const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  {
    value: 'es',
    labelKey: 'settings.language.es',
    descriptionKey: 'settings.language.es.description',
    translatedKey: 'settings.language.es.translated',
    flag: '/brand/flags/es.svg',
  },
  {
    value: 'en',
    labelKey: 'settings.language.en',
    descriptionKey: 'settings.language.en.description',
    translatedKey: 'settings.language.en.translated',
    flag: '/brand/flags/en.svg',
  },
  {
    value: 'system',
    labelKey: 'settings.language.system',
    descriptionKey: 'settings.language.system.description',
  },
];

export interface LanguagePickerProps {
  readonly value: Locale;
  readonly onChange: (value: Locale) => void;
  readonly disabled?: boolean;
  readonly labelledBy: string;
}

export function LanguagePicker({
  value,
  onChange,
  disabled = false,
  labelledBy,
}: LanguagePickerProps): ReactNode {
  const { t } = useI18n();
  const baseId = useId();
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    LANGUAGE_OPTIONS.findIndex((option) => option.value === value),
  );

  function accessibleLabel(option: LanguageOption): string {
    if (option.translatedKey === undefined) {
      return t(option.labelKey);
    }
    const native = t(option.labelKey);
    const translated = t(option.translatedKey);
    if (native === translated) {
      return native;
    }
    return t('settings.language.optionLabel', { native, translated });
  }

  function moveTo(index: number): void {
    const option = LANGUAGE_OPTIONS[index];
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
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        moveTo((index + 1) % LANGUAGE_OPTIONS.length);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        moveTo((index - 1 + LANGUAGE_OPTIONS.length) % LANGUAGE_OPTIONS.length);
        break;
      case 'Home':
        event.preventDefault();
        moveTo(0);
        break;
      case 'End':
        event.preventDefault();
        moveTo(LANGUAGE_OPTIONS.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-orientation="vertical"
      className="settings-language-picker"
      data-testid="language-picker"
    >
      {LANGUAGE_OPTIONS.map((option, index) => {
        const selected = option.value === value;
        const descriptionId = `${baseId}-${option.value}-description`;

        return (
          <button
            key={option.value}
            ref={(node) => {
              optionRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={accessibleLabel(option)}
            aria-describedby={descriptionId}
            tabIndex={index === selectedIndex ? 0 : -1}
            disabled={disabled}
            className="settings-language-option"
            data-testid={`language-option-${option.value}`}
            onClick={() => {
              if (!selected) {
                onChange(option.value);
              }
            }}
            onKeyDown={(event) => {
              handleKeyDown(event, index);
            }}
          >
            {option.flag === undefined ? (
              <span className="settings-language-option__icon" aria-hidden="true">
                <Globe size={18} />
              </span>
            ) : (
              <img
                className="settings-language-option__flag"
                src={option.flag}
                alt=""
                aria-hidden="true"
                width={24}
                height={16}
                data-testid={`language-flag-${option.value}`}
              />
            )}
            <span className="settings-language-option__text">
              <span className="settings-language-option__native">{t(option.labelKey)}</span>
              <span id={descriptionId} className="settings-language-option__description">
                {t(option.descriptionKey)}
              </span>
            </span>
            {selected ? (
              <Check
                aria-hidden="true"
                size={16}
                className="settings-language-option__check"
                data-testid={`language-option-check-${option.value}`}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
