import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { TEXT_FONT_SIZES } from '../../../domain/element';
import type {
  HeadingLevel,
  TextBooleanMark,
  TextBooleanMarkState,
  TextFontSize,
  TextHeadingState,
} from '../../../domain/element';
import { FONT_FAMILY_OPTIONS, fontFamilyCss } from './font-families';
import type { TextFormatAction, TextFormatState } from './text-format';

const BOOLEAN_MARK_TO_COMMAND: Record<TextBooleanMark, string> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strikethrough: 'strike',
  highlight: 'highlight',
};

const DEFAULT_STEP_FONT_SIZE = 14;

export function applyFormatToEditor(editor: Editor, action: TextFormatAction): void {
  const chain = editor.chain().focus(undefined, { scrollIntoView: false });

  switch (action.kind) {
    case 'fontFamily':
      chain.setFontFamily(fontFamilyCss(action.value)).run();
      return;
    case 'fontSize':
      chain.setFontSize(`${action.value}px`).run();
      return;
    case 'increaseFontSize':
      chain.setFontSize(`${stepEditorFontSize(editor, 1)}px`).run();
      return;
    case 'decreaseFontSize':
      chain.setFontSize(`${stepEditorFontSize(editor, -1)}px`).run();
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
    case 'heading':
      if (action.level === null) {
        chain.setParagraph().run();
        return;
      }
      chain.setHeading({ level: action.level }).run();
      return;
    case 'list':
      if (action.value === null) {
        if (editor.isActive('bulletList')) {
          chain.toggleBulletList().run();
          return;
        }
        if (editor.isActive('orderedList')) {
          chain.toggleOrderedList().run();
          return;
        }
        return;
      }
      if (action.value === 'bulletList') {
        chain.toggleBulletList().run();
        return;
      }
      chain.toggleOrderedList().run();
      return;
  }
}

export function getEditorFormatState(editor: Editor): TextFormatState {
  const styleAttrs = editor.getAttributes('textStyle');
  const blockStates = collectBlockStates(editor);

  return {
    bold: readEditorMarkState(editor, 'bold'),
    italic: readEditorMarkState(editor, 'italic'),
    underline: readEditorMarkState(editor, 'underline'),
    strikethrough: readEditorMarkState(editor, 'strike'),
    highlight: readEditorMarkState(editor, 'highlight'),
    ...readFontFamily(styleAttrs.fontFamily),
    ...readFontSize(styleAttrs.fontSize),
    ...(typeof styleAttrs.color === 'string' ? { color: styleAttrs.color } : {}),
    ...readAlign(editor),
    heading: blockStates.heading,
    bulletList: blockStates.bulletList,
    orderedList: blockStates.orderedList,
  };
}

function readEditorMarkState(editor: Editor, markName: string): TextBooleanMarkState {
  const { from, to } = editor.state.selection;
  let sawTrue = false;
  let sawFalse = false;

  editor.state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText || typeof node.text !== 'string' || node.text.length === 0) {
      return;
    }

    if (node.marks.some((mark) => mark.type.name === markName)) {
      sawTrue = true;
    } else {
      sawFalse = true;
    }
  });

  if (sawTrue && sawFalse) {
    return 'mixed';
  }
  return sawTrue ? 'on' : 'off';
}

interface EditorBlockStates {
  readonly heading: TextHeadingState;
  readonly bulletList: TextBooleanMarkState;
  readonly orderedList: TextBooleanMarkState;
}

function collectBlockStates(editor: Editor): EditorBlockStates {
  const { state } = editor;
  const { from, to } = state.selection;

  let heading: TextHeadingState = 'off';
  let headingSeen = false;
  let sawBullet = false;
  let sawNoBullet = false;
  let sawOrdered = false;
  let sawNoOrdered = false;

  state.doc.nodesBetween(from, to, (node: PMNode, _pos, parent) => {
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      const value: TextHeadingState =
        node.type.name === 'heading' ? readHeadingLevel(node.attrs.level) : 'off';

      if (!headingSeen) {
        heading = value;
        headingSeen = true;
      } else if (heading !== value) {
        heading = 'mixed';
      }
    }

    if (parent === state.doc) {
      const isBullet = node.type.name === 'bulletList';
      const isOrdered = node.type.name === 'orderedList';

      if (isBullet) sawBullet = true;
      if (!isBullet) sawNoBullet = true;
      if (isOrdered) sawOrdered = true;
      if (!isOrdered) sawNoOrdered = true;
    }
  });

  return {
    heading: headingSeen ? heading : 'off',
    bulletList: combineListFlags(sawBullet, sawNoBullet),
    orderedList: combineListFlags(sawOrdered, sawNoOrdered),
  };
}

function combineListFlags(sawKind: boolean, sawOther: boolean): TextBooleanMarkState {
  if (sawKind && sawOther) {
    return 'mixed';
  }
  return sawKind ? 'on' : 'off';
}

function readHeadingLevel(value: unknown): HeadingLevel {
  return value === 2 || value === 3 ? value : 1;
}

function stepEditorFontSize(editor: Editor, direction: 1 | -1): TextFontSize {
  const attrs = editor.getAttributes('textStyle');
  const sizes = TEXT_FONT_SIZES as readonly number[];
  const parsed =
    typeof attrs.fontSize === 'string' ? Math.round(Number.parseFloat(attrs.fontSize)) : Number.NaN;
  const baseIndex = sizes.includes(parsed)
    ? sizes.indexOf(parsed)
    : sizes.indexOf(DEFAULT_STEP_FONT_SIZE);
  const nextIndex = Math.min(Math.max(baseIndex + direction, 0), sizes.length - 1);

  return TEXT_FONT_SIZES[nextIndex];
}

function readFontFamily(
  value: unknown,
): { fontFamily: NonNullable<TextFormatState['fontFamily']> } | Record<string, never> {
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
