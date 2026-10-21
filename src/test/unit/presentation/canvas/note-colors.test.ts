import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  isNoteColorSelected,
  NOTE_COLOR_PALETTE,
  NOTE_DEFAULT_COLOR,
} from '../../../../presentation/canvas/note-colors';

const BRAND_THEME_CSS = readFileSync(
  path.resolve(__dirname, '../../../../presentation/styles/brand/brand-theme.css'),
  'utf8',
);

function cssVarName(value: string): string {
  return value.slice(4, -1);
}

function declarations(css: string, name: string): number {
  return (css.match(new RegExp(`${name}:`, 'g')) ?? []).length;
}

describe('note color palette', () => {
  it('offers five distinguishable options', () => {
    const ids = NOTE_COLOR_PALETTE.map((option) => option.id);

    expect(NOTE_COLOR_PALETTE).toHaveLength(5);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses brand note tokens for every background', () => {
    for (const option of NOTE_COLOR_PALETTE) {
      expect(option.color).toMatch(/^var\(--cach-note-[a-z]+\)$/);
    }
  });

  it('declares every note token for light, dark and system-dark themes', () => {
    const tokens = [NOTE_DEFAULT_COLOR, ...NOTE_COLOR_PALETTE.map((option) => option.color)];

    for (const token of tokens) {
      expect(declarations(BRAND_THEME_CSS, cssVarName(token))).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps the legacy stored values declared for old notes', () => {
    for (const option of NOTE_COLOR_PALETTE) {
      expect(option.legacyColor).toMatch(/^var\(--rr-color-background-[a-z]+\)$/);
      expect(BRAND_THEME_CSS).toContain(`${cssVarName(option.legacyColor)}:`);
    }
  });

  it('detects both current and legacy selections', () => {
    const [option] = NOTE_COLOR_PALETTE;

    expect(option).toBeDefined();
    if (option === undefined) {
      return;
    }

    expect(isNoteColorSelected(option, option.color)).toBe(true);
    expect(isNoteColorSelected(option, option.legacyColor)).toBe(true);
    expect(isNoteColorSelected(option, undefined)).toBe(false);
    expect(isNoteColorSelected(option, 'var(--cach-note-amber)')).toBe(option.id === 'amber');
  });
});
