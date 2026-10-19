import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Strikethrough,
  Type,
  Underline,
} from '@raulrod/icons';
import type { ReactElement } from 'react';
import { TEXT_BOOLEAN_MARKS, TEXT_FONT_SIZES } from '../../../domain/element';
import type { TextAlign } from '../../../domain/element';
import { FONT_FAMILY_OPTIONS } from './font-families';
import { TEXT_COLOR_SWATCHES } from './text-format-options';

export { FONT_FAMILY_OPTIONS, TEXT_COLOR_SWATCHES, TEXT_FONT_SIZES };

export interface AlignOption {
  readonly value: TextAlign;
  readonly label: string;
  readonly icon: ReactElement;
}

export const ALIGN_OPTIONS: readonly AlignOption[] = [
  { value: 'left', label: 'Align left', icon: <AlignLeft aria-hidden="true" size={16} /> },
  { value: 'center', label: 'Align center', icon: <AlignCenter aria-hidden="true" size={16} /> },
  { value: 'right', label: 'Align right', icon: <AlignRight aria-hidden="true" size={16} /> },
  { value: 'justify', label: 'Justify', icon: <AlignJustify aria-hidden="true" size={16} /> },
];

export interface BooleanMarkOption {
  readonly mark: (typeof TEXT_BOOLEAN_MARKS)[number];
  readonly label: string;
  readonly icon: ReactElement;
}

export const BOOLEAN_MARK_OPTIONS: readonly BooleanMarkOption[] = [
  { mark: 'bold', label: 'Bold', icon: <Bold aria-hidden="true" size={16} /> },
  { mark: 'underline', label: 'Underline', icon: <Underline aria-hidden="true" size={16} /> },
  {
    mark: 'strikethrough',
    label: 'Strikethrough',
    icon: <Strikethrough aria-hidden="true" size={16} />,
  },
];

export const FONT_FAMILY_LABELS: Record<(typeof FONT_FAMILY_OPTIONS)[number]['value'], string> = {
  default: 'Default',
  arial: 'Arial',
  georgia: 'Georgia',
  times: 'Times New Roman',
  verdana: 'Verdana',
  courier: 'Courier New',
};

export function fontSizeLabel(size: number): string {
  return String(size);
}

export function alignIcon(align: TextAlign): ReactElement {
  const option = ALIGN_OPTIONS.find((candidate) => candidate.value === align);
  return option?.icon ?? <Type aria-hidden="true" size={16} />;
}
