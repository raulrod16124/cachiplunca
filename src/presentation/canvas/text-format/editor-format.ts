import type { Editor } from '@tiptap/core';
import { TEXT_FONT_SIZES } from '../../../domain/element';
import type { TextBooleanMark, TextFontSize } from '../../../domain/element';
import { FONT_FAMILY_OPTIONS, fontFamilyCss } from './font-families';
import type { TextFormatAction, TextFormatState } from './text-format';

const BOOLEAN_MARK_TO_COMMAND: Record<TextBooleanMark, 'bold' | 'underline' | 'strike'> = {
  bold: 'bold',
  underline: 'underline',
  strikethrough: 'strike',
};

export function applyFormatToEditor(editor: Editor, action: TextFormatAction): void {
  const chain = editor.chain().focus(undefined, { scrollIntoView: false });

  switch (action.kind) {
    case 'fontFamily':
      chain.setFontFamily(fontFamilyCss(action.value)).run();
      return;
    case 'fontSize':
      chain.setFontSize(`${action.value}px`).run();
      return;
    case 'color':
      chain.setColor(action.value).run();
      return;
    case 'toggleMark':
      chain.toggleMark(BOOLEAN_MARK_TO_COMMAND[action.mark]).run();
      return;
    case 'align':
      chain.setTextAlign(action.value).run();
      return;
  }
}

export function getEditorFormatState(editor: Editor): TextFormatState {
  const styleAttrs = editor.getAttributes('textStyle');

  return {
    bold: editor.isActive('bold') ? 'on' : 'off',
    underline: editor.isActive('underline') ? 'on' : 'off',
    strikethrough: editor.isActive('strike') ? 'on' : 'off',
    ...readFontFamily(styleAttrs.fontFamily),
    ...readFontSize(styleAttrs.fontSize),
    ...(typeof styleAttrs.color === 'string' ? { color: styleAttrs.color } : {}),
    ...readAlign(editor),
  };
}

function readFontFamily(value: unknown): { fontFamily: NonNullable<TextFormatState['fontFamily']> } | Record<string, never> {
  if (typeof value !== 'string') {
    return {};
  }

  const match = FONT_FAMILY_OPTIONS.find((option) => option.css === value);

  return match === undefined ? {} : { fontFamily: match.value };
}

function readFontSize(value: unknown): { fontSize: TextFontSize } | Record<string, never> {
  if (typeof value !== 'string') {
    return {};
  }

  const parsed = Math.round(Number.parseFloat(value));

  return (TEXT_FONT_SIZES as readonly number[]).includes(parsed)
    ? { fontSize: parsed as TextFontSize }
    : {};
}

function readAlign(editor: Editor): { align: NonNullable<TextFormatState['align']> } {
  for (const align of ['left', 'center', 'right', 'justify'] as const) {
    if (editor.isActive({ textAlign: align })) {
      return { align };
    }
  }
  return { align: 'left' };
}
