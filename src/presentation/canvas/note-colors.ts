import type { TranslationKey } from '../i18n';

export interface NoteColorOption {
  readonly id: string;
  readonly labelKey: TranslationKey;
  readonly color: string;
  /**
   * Value persisted by the pre-redesign palette. It is only used to detect the
   * current selection on old notes; selecting a color always writes `color`.
   */
  readonly legacyColor: string;
}

export const NOTE_DEFAULT_COLOR = 'var(--cach-note-default)';

/**
 * Theme-aware sticky-note palette. Every value references a `--cach-note-*`
 * custom property declared in `brand-theme.css`, so light and dark themes stay
 * legible (contrast with `color.text.primary` is above 9.8:1 in both themes).
 * `legacyColor` keeps older notes selectable without migrating stored strings.
 */
export const NOTE_COLOR_PALETTE: readonly NoteColorOption[] = [
  {
    id: 'green',
    labelKey: 'canvas.contextMenu.noteColor.green',
    color: 'var(--cach-note-green)',
    legacyColor: 'var(--rr-color-background-success)',
  },
  {
    id: 'amber',
    labelKey: 'canvas.contextMenu.noteColor.amber',
    color: 'var(--cach-note-amber)',
    legacyColor: 'var(--rr-color-background-warning)',
  },
  {
    id: 'blue',
    labelKey: 'canvas.contextMenu.noteColor.blue',
    color: 'var(--cach-note-blue)',
    legacyColor: 'var(--rr-color-background-info)',
  },
  {
    id: 'red',
    labelKey: 'canvas.contextMenu.noteColor.red',
    color: 'var(--cach-note-red)',
    legacyColor: 'var(--rr-color-background-destructive)',
  },
  {
    id: 'gray',
    labelKey: 'canvas.contextMenu.noteColor.gray',
    color: 'var(--cach-note-gray)',
    legacyColor: 'var(--rr-color-background-sunken)',
  },
];

/** Matches both the current and the legacy stored value of a palette option. */
export function isNoteColorSelected(
  option: NoteColorOption,
  currentColor: string | undefined,
): boolean {
  return currentColor === option.color || currentColor === option.legacyColor;
}
