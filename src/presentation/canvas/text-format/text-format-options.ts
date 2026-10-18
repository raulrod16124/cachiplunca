import type { TextFontSize } from '../../../domain/element';

export const TEXT_COLOR_SWATCHES: readonly string[] = [
  '#000000',
  '#434343',
  '#666666',
  '#999999',
  '#b7b7b7',
  '#ffffff',
  '#e6194b',
  '#f58231',
  '#ffe119',
  '#bfef45',
  '#3cb44b',
  '#42d4f4',
  '#4363d8',
  '#911eb4',
  '#f032e6',
  '#a9a9a9',
];

export const TEXT_STANDARD_COLORS: readonly string[] = [
  '#c00000',
  '#ff0000',
  '#ffc000',
  '#ffff00',
  '#92d050',
  '#00b050',
  '#00b0f0',
  '#0070c0',
  '#002060',
  '#7030a0',
];

export function fontSizeLabel(size: TextFontSize): string {
  return String(size);
}
