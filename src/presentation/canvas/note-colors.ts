import type { TranslationKey } from '../i18n';
import { token } from '../styles';

export interface NoteColorOption {
  readonly id: string;
  readonly labelKey: TranslationKey;
  readonly color: string;
}

/**
 * Theme-aware note backgrounds. Every value resolves to a semantic background
 * token so light and dark themes stay legible (contrast with
 * `color.text.primary` is above 11:1 in both themes).
 */
export const NOTE_COLOR_PALETTE: readonly NoteColorOption[] = [
  {
    id: 'green',
    labelKey: 'canvas.contextMenu.noteColor.green',
    color: token('color.background.success'),
  },
  {
    id: 'amber',
    labelKey: 'canvas.contextMenu.noteColor.amber',
    color: token('color.background.warning'),
  },
  {
    id: 'blue',
    labelKey: 'canvas.contextMenu.noteColor.blue',
    color: token('color.background.info'),
  },
  {
    id: 'red',
    labelKey: 'canvas.contextMenu.noteColor.red',
    color: token('color.background.destructive'),
  },
  {
    id: 'gray',
    labelKey: 'canvas.contextMenu.noteColor.gray',
    color: token('color.background.sunken'),
  },
];
