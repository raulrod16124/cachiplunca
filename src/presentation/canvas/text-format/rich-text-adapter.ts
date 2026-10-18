import type { JSONContent } from '@tiptap/core';
import {
  DEFAULT_TEXT_ALIGN,
  TEXT_BOOLEAN_MARKS,
  TEXT_FONT_SIZES,
  richTextFromPlain,
} from '../../../domain/element';
import type {
  RichTextBlock,
  RichTextDocument,
  RichTextMarks,
  RichTextSpan,
  TextAlign,
  TextBooleanMark,
  TextFontSize,
} from '../../../domain/element';
import { FONT_FAMILY_OPTIONS, fontFamilyCss } from './font-families';

const BOOLEAN_MARK_TO_EDITOR: Record<TextBooleanMark, string> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strikethrough: 'strike',
  highlight: 'highlight',
};

const EDITOR_MARK_TO_BOOLEAN: Record<string, TextBooleanMark> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strike: 'strikethrough',
  highlight: 'highlight',
};

const CSS_TO_FONT_FAMILY = new Map(FONT_FAMILY_OPTIONS.map((option) => [option.css, option.value]));

type MutableMarks = {
  -readonly [K in keyof RichTextMarks]?: RichTextMarks[K];
};

export function docToEditorJson(doc: RichTextDocument): JSONContent {
  return {
    type: 'doc',
    content: doc.blocks.map((block) => blockToEditorNode(block)),
  };
}

export function editorJsonToDoc(json: JSONContent | null | undefined): RichTextDocument {
  if (json === null || json === undefined || json.type !== 'doc') {
    return richTextFromPlain('');
  }

  const blocks: RichTextBlock[] = [];

  for (const node of json.content ?? []) {
    if (node.type !== 'paragraph') {
      continue;
    }

    const spans: RichTextSpan[] = [];

    for (const child of node.content ?? []) {
      if (child.type !== 'text' || typeof child.text !== 'string') {
        continue;
      }

      const marks = editorMarksToDomain(child.marks ?? []);
      spans.push(marks === undefined ? { text: child.text } : { text: child.text, marks });
    }

    blocks.push({
      type: 'paragraph',
      align: readAlign(node.attrs?.textAlign),
      spans,
    });
  }

  if (blocks.length === 0) {
    return richTextFromPlain('');
  }

  return { blocks };
}

function blockToEditorNode(block: RichTextBlock): JSONContent {
  if (block.type !== 'paragraph') {
    return {
      type: 'paragraph',
      attrs: { textAlign: DEFAULT_TEXT_ALIGN },
      content: undefined,
    };
  }

  return {
    type: 'paragraph',
    attrs: { textAlign: block.align },
    content:
      block.spans.length === 0
        ? undefined
        : block.spans.map((span) => ({
            type: 'text',
            text: span.text,
            ...(span.marks === undefined ? {} : { marks: domainMarksToEditor(span.marks) }),
          })),
  };
}

function domainMarksToEditor(marks: RichTextMarks): JSONContent['marks'] {
  const editorMarks: JSONContent['marks'] = [];

  for (const key of TEXT_BOOLEAN_MARKS) {
    if (marks[key] === true) {
      editorMarks.push({ type: BOOLEAN_MARK_TO_EDITOR[key] });
    }
  }

  const styleAttrs: Record<string, string> = {};

  if (marks.color !== undefined) styleAttrs.color = marks.color;
  if (marks.fontFamily !== undefined) styleAttrs.fontFamily = fontFamilyCss(marks.fontFamily);
  if (marks.fontSize !== undefined) styleAttrs.fontSize = `${marks.fontSize}px`;

  if (Object.keys(styleAttrs).length > 0) {
    editorMarks.push({ type: 'textStyle', attrs: styleAttrs });
  }

  return editorMarks;
}

function editorMarksToDomain(editorMarks: readonly JSONContent[]): RichTextMarks | undefined {
  const marks: MutableMarks = {};

  for (const mark of editorMarks) {
    if (mark.type === undefined) {
      continue;
    }

    const booleanMark = EDITOR_MARK_TO_BOOLEAN[mark.type];

    if (booleanMark !== undefined) {
      marks[booleanMark] = true;
      continue;
    }

    if (mark.type === 'textStyle') {
      applyTextStyleAttrs(marks, mark.attrs ?? {});
    }
  }

  return Object.keys(marks).length === 0 ? undefined : marks;
}

function applyTextStyleAttrs(marks: MutableMarks, attrs: Record<string, unknown>): void {
  if (typeof attrs.color === 'string' && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(attrs.color)) {
    marks.color = attrs.color;
  }

  if (typeof attrs.fontFamily === 'string') {
    const fontFamily = CSS_TO_FONT_FAMILY.get(attrs.fontFamily);
    if (fontFamily !== undefined) {
      marks.fontFamily = fontFamily;
    }
  }

  if (typeof attrs.fontSize === 'string') {
    const parsed = parseFontSize(attrs.fontSize);
    if (parsed !== undefined) {
      marks.fontSize = parsed;
    }
  }
}

function parseFontSize(value: string): TextFontSize | undefined {
  const parsed = Math.round(Number.parseFloat(value));

  return (TEXT_FONT_SIZES as readonly number[]).includes(parsed)
    ? (parsed as TextFontSize)
    : undefined;
}

function readAlign(value: unknown): TextAlign {
  return value === 'center' || value === 'right' || value === 'justify'
    ? value
    : DEFAULT_TEXT_ALIGN;
}
