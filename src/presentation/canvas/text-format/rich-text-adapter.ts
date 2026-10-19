import type { JSONContent } from '@tiptap/core';
import {
  DEFAULT_TEXT_ALIGN,
  TEXT_BOOLEAN_MARKS,
  TEXT_FONT_SIZES,
  richTextFromPlain,
} from '../../../domain/element';
import type {
  HeadingLevel,
  RichTextBlock,
  RichTextDocument,
  RichTextListItem,
  RichTextListItemContentBlock,
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
    const block = editorNodeToBlock(node);

    if (block !== null) {
      blocks.push(block);
    }
  }

  if (blocks.length === 0) {
    return richTextFromPlain('');
  }

  return { blocks };
}

function editorNodeToBlock(node: JSONContent): RichTextBlock | null {
  switch (node.type) {
    case 'paragraph':
      return {
        type: 'paragraph',
        align: readAlign(node.attrs?.textAlign),
        spans: editorContentToSpans(node.content),
      };
    case 'heading':
      return {
        type: 'heading',
        level: readHeadingLevel(node.attrs?.level),
        align: readAlign(node.attrs?.textAlign),
        spans: editorContentToSpans(node.content),
      };
    case 'bulletList':
    case 'orderedList': {
      const items = editorContentToListItems(node.content);

      if (items.length === 0) {
        return null;
      }

      return { type: node.type, items };
    }
    default:
      return null;
  }
}

function editorContentToSpans(content: readonly JSONContent[] | undefined): RichTextSpan[] {
  const spans: RichTextSpan[] = [];

  for (const child of content ?? []) {
    if (child.type !== 'text' || typeof child.text !== 'string') {
      continue;
    }

    const marks = editorMarksToDomain(child.marks ?? []);
    spans.push(marks === undefined ? { text: child.text } : { text: child.text, marks });
  }

  return spans;
}

function editorContentToListItems(content: readonly JSONContent[] | undefined): RichTextListItem[] {
  const items: RichTextListItem[] = [];

  for (const node of content ?? []) {
    if (node.type !== 'listItem') {
      continue;
    }

    const itemBlocks: RichTextListItemContentBlock[] = [];

    for (const child of node.content ?? []) {
      const block = editorNodeToBlock(child);

      if (block !== null) {
        itemBlocks.push(block);
      }
    }

    if (itemBlocks.length > 0) {
      items.push({ type: 'listItem', content: itemBlocks });
    }
  }

  return items;
}

function blockToEditorNode(block: RichTextBlock): JSONContent {
  switch (block.type) {
    case 'paragraph':
      return {
        type: 'paragraph',
        attrs: { textAlign: block.align },
        content: spansToEditorContent(block.spans),
      };
    case 'heading':
      return {
        type: 'heading',
        attrs: { level: block.level, textAlign: block.align },
        content: spansToEditorContent(block.spans),
      };
    case 'bulletList':
    case 'orderedList':
      return {
        type: block.type,
        content: block.items.map((item) => ({
          type: 'listItem',
          content:
            item.content.length === 0
              ? undefined
              : item.content.map((child) => blockToEditorNode(child)),
        })),
      };
  }
}

function spansToEditorContent(spans: readonly RichTextSpan[]): JSONContent[] | undefined {
  if (spans.length === 0) {
    return undefined;
  }

  return spans.map((span) => ({
    type: 'text',
    text: span.text,
    ...(span.marks === undefined ? {} : { marks: domainMarksToEditor(span.marks) }),
  }));
}

function domainMarksToEditor(marks: RichTextMarks): JSONContent['marks'] {
  const editorMarks: JSONContent['marks'] = [];

  for (const key of TEXT_BOOLEAN_MARKS) {
    if (marks[key] !== true) {
      continue;
    }

    if (key === 'highlight' && marks.highlightColor !== undefined) {
      editorMarks.push({ type: 'highlight', attrs: { color: marks.highlightColor } });
      continue;
    }

    editorMarks.push({ type: BOOLEAN_MARK_TO_EDITOR[key] });
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

      if (booleanMark === 'highlight') {
        readHighlightColorAttr(marks, mark.attrs ?? {});
      }

      continue;
    }

    if (mark.type === 'textStyle') {
      applyTextStyleAttrs(marks, mark.attrs ?? {});
    }
  }

  return Object.keys(marks).length === 0 ? undefined : marks;
}

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function readHighlightColorAttr(marks: MutableMarks, attrs: Record<string, unknown>): void {
  if (typeof attrs.color === 'string' && HEX_COLOR_PATTERN.test(attrs.color)) {
    marks.highlightColor = attrs.color;
  }
}

function applyTextStyleAttrs(marks: MutableMarks, attrs: Record<string, unknown>): void {
  if (typeof attrs.color === 'string' && HEX_COLOR_PATTERN.test(attrs.color)) {
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

function readHeadingLevel(value: unknown): HeadingLevel {
  return value === 2 || value === 3 ? value : 1;
}
