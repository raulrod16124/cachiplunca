import type { TextFontFamily } from '../../../domain/element';

export interface FontFamilyOption {
  readonly value: TextFontFamily;
  readonly label: string;
  readonly css: string;
}

export const FONT_FAMILY_OPTIONS: readonly FontFamilyOption[] = [
  { value: 'default', label: 'Default', css: 'inherit' },
  { value: 'arial', label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { value: 'georgia', label: 'Georgia', css: 'Georgia, serif' },
  { value: 'times', label: 'Times New Roman', css: "'Times New Roman', Times, serif" },
  { value: 'verdana', label: 'Verdana', css: 'Verdana, Geneva, sans-serif' },
  { value: 'courier', label: 'Courier New', css: "'Courier New', Courier, monospace" },
];

export function fontFamilyCss(value: TextFontFamily): string {
  return FONT_FAMILY_OPTIONS.find((option) => option.value === value)?.css ?? 'inherit';
}

export function fontFamilyLabel(value: TextFontFamily): string {
  return FONT_FAMILY_OPTIONS.find((option) => option.value === value)?.label ?? 'Default';
}
