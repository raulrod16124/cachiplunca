import type { Editor } from '@tiptap/core';
import type { ReactElement } from 'react';
import styled from 'styled-components';
import type { TextFontFamily, TextFontSize } from '../../../domain/element';
import { applyFormatToEditor, getEditorFormatState } from './editor-format';
import {
  ALIGN_OPTIONS,
  BOOLEAN_MARK_OPTIONS,
  FONT_FAMILY_OPTIONS,
  TEXT_COLOR_SWATCHES,
  TEXT_FONT_SIZES,
} from './text-format-menu-options';

const Toolbar = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.canvas.surface};
  box-shadow: ${({ theme }) => theme.shadow.md};
  white-space: nowrap;
  z-index: 10;
`;

const Select = styled.select`
  font-size: ${({ theme }) => theme.font.size.sm};
  padding: 2px 4px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.color.border.default};
  background-color: ${({ theme }) => theme.canvas.surface};
  color: ${({ theme }) => theme.color.text.primary};
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.color.focusRing : theme.color.border.default)};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme, $active }) =>
    $active ? theme.canvas.surfaceMuted : theme.canvas.surface};
  color: ${({ theme }) => theme.color.text.primary};
  cursor: pointer;
`;

const SwatchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Swatch = styled.button<{ $color: string; $active: boolean }>`
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1.5px solid
    ${({ theme, $active }) => ($active ? theme.color.focusRing : theme.color.border.default)};
  border-radius: 50%;
  background-color: ${({ $color }) => $color};
  cursor: pointer;
`;

export interface TextFormatToolbarProps {
  readonly editor: Editor;
}

export function TextFormatToolbar({ editor }: TextFormatToolbarProps): ReactElement {
  const state = getEditorFormatState(editor);

  return (
    <Toolbar data-testid="text-format-toolbar" role="toolbar" aria-label="Text formatting">
      <Select
        aria-label="Font"
        value={state.fontFamily ?? 'default'}
        onChange={(event) => {
          applyFormatToEditor(editor, {
            kind: 'fontFamily',
            value: event.target.value as TextFontFamily,
          });
        }}
      >
        {FONT_FAMILY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Font size"
        value={state.fontSize === undefined ? '' : String(state.fontSize)}
        onChange={(event) => {
          const value = Number(event.target.value);
          if (!Number.isNaN(value)) {
            applyFormatToEditor(editor, { kind: 'fontSize', value: value as TextFontSize });
          }
        }}
      >
        <option value="" disabled>
          Size
        </option>
        {TEXT_FONT_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </Select>

      <SwatchRow role="group" aria-label="Text color">
        {TEXT_COLOR_SWATCHES.map((color) => (
          <Swatch
            key={color}
            type="button"
            aria-label={`Text color ${color}`}
            $color={color}
            $active={state.color === color}
            onClick={() => applyFormatToEditor(editor, { kind: 'color', value: color })}
          />
        ))}
      </SwatchRow>

      {BOOLEAN_MARK_OPTIONS.map((option) => (
        <ToggleButton
          key={option.mark}
          type="button"
          aria-label={option.label}
          aria-pressed={state[option.mark] === 'on'}
          $active={state[option.mark] === 'on' || state[option.mark] === 'mixed'}
          onClick={() => applyFormatToEditor(editor, { kind: 'toggleMark', mark: option.mark })}
        >
          {option.icon}
        </ToggleButton>
      ))}

      {ALIGN_OPTIONS.map((option) => (
        <ToggleButton
          key={option.value}
          type="button"
          aria-label={option.label}
          aria-pressed={state.align === option.value}
          $active={state.align === option.value}
          onClick={() => applyFormatToEditor(editor, { kind: 'align', value: option.value })}
        >
          {option.icon}
        </ToggleButton>
      ))}
    </Toolbar>
  );
}
