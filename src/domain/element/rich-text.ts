export const TEXT_FONT_FAMILIES = [
  'default',
  'arial',
  'georgia',
  'times',
  'verdana',
  'courier',
] as const;

export type TextFontFamily = (typeof TEXT_FONT_FAMILIES)[number];

export const TEXT_FONT_SIZES = [8, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72] as const;

export type TextFontSize = (typeof TEXT_FONT_SIZES)[number];

export const TEXT_ALIGNS = ['left', 'center', 'right', 'justify'] as const;

export type TextAlign = (typeof TEXT_ALIGNS)[number];

export const TEXT_BOOLEAN_MARKS = ['bold', 'underline', 'strikethrough'] as const;

export type TextBooleanMark = (typeof TEXT_BOOLEAN_MARKS)[number];

export const DEFAULT_TEXT_ALIGN: TextAlign = 'left';

export const RICH_TEXT_LIMITS = {
  maxBlocks: 200,
  maxSpansPerBlock: 2000,
  maxTextLength: 100_000,
} as const;

export interface RichTextMarks {
  readonly bold?: boolean;
  readonly underline?: boolean;
  readonly strikethrough?: boolean;
  readonly color?: string;
  readonly fontFamily?: TextFontFamily;
  readonly fontSize?: TextFontSize;
}

export interface RichTextSpan {
  readonly text: string;
  readonly marks?: RichTextMarks;
}

export interface RichTextBlock {
  readonly type: 'paragraph';
  readonly align: TextAlign;
  readonly spans: readonly RichTextSpan[];
}

export interface RichTextDocument {
  readonly blocks: readonly RichTextBlock[];
}

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function richTextFromPlain(plain: string): RichTextDocument {
  if (typeof plain !== 'string') {
    throw new Error('Rich text content must be a string');
  }

  return {
    blocks: [
      {
        type: 'paragraph',
        align: DEFAULT_TEXT_ALIGN,
        spans: plain.length === 0 ? [] : [{ text: plain }],
      },
    ],
  };
}

export function richTextToPlain(doc: RichTextDocument): string {
  return doc.blocks.map((block) => block.spans.map((span) => span.text).join('')).join('\n');
}

export function isEmptyRichText(doc: RichTextDocument): boolean {
  return richTextToPlain(doc).trim().length === 0;
}

export function parseRichTextDocument(value: unknown): RichTextDocument {
  validateRichTextDocument(value);
  return normalizeRichTextDocument(value);
}

export function validateRichTextDocument(doc: unknown): asserts doc is RichTextDocument {
  if (!isRecord(doc)) {
    throw new Error('TextElement content must be a rich text document');
  }

  const { blocks } = doc;

  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new Error('Rich text content "blocks" must be a non-empty array');
  }

  if (blocks.length > RICH_TEXT_LIMITS.maxBlocks) {
    throw new Error(
      `Rich text content cannot exceed ${RICH_TEXT_LIMITS.maxBlocks} blocks (${blocks.length} given)`,
    );
  }

  let totalLength = 0;

  for (const block of blocks) {
    if (!isRecord(block) || block.type !== 'paragraph') {
      throw new Error('Rich text content blocks must be paragraphs');
    }

    if (!isTextAlign(block.align)) {
      throw new Error('Rich text content block "align" must be left, center, right or justify');
    }

    const { spans } = block;

    if (!Array.isArray(spans)) {
      throw new Error('Rich text content block "spans" must be an array');
    }

    if (spans.length > RICH_TEXT_LIMITS.maxSpansPerBlock) {
      throw new Error(
        `Rich text content blocks cannot exceed ${RICH_TEXT_LIMITS.maxSpansPerBlock} spans`,
      );
    }

    for (const span of spans) {
      if (!isRecord(span) || typeof span.text !== 'string') {
        throw new Error('Rich text content spans must have a string "text"');
      }

      totalLength += span.text.length;

      if (span.marks !== undefined) {
        validateMarks(span.marks);
      }
    }
  }

  if (totalLength > RICH_TEXT_LIMITS.maxTextLength) {
    throw new Error(
      `Rich text content cannot exceed ${RICH_TEXT_LIMITS.maxTextLength} characters (${totalLength} given)`,
    );
  }
}

export type DocumentBooleanMarkPatch = {
  readonly [K in TextBooleanMark]: boolean;
};

export function setDocumentBooleanMark(
  doc: RichTextDocument,
  mark: TextBooleanMark,
  enabled: boolean,
): RichTextDocument {
  return mapSpans(doc, (span) => {
    const marks = applyBooleanMark(span.marks, mark, enabled);
    return marks === undefined ? { text: span.text } : { text: span.text, marks };
  });
}

export function setDocumentColor(doc: RichTextDocument, color: string | null): RichTextDocument {
  if (color !== null && !HEX_COLOR_PATTERN.test(color)) {
    throw new Error('Text color must be a hex color like #ff0000');
  }

  return mapSpans(doc, (span) => {
    const marks = color === null ? omitStyle(span.marks, 'color') : { ...span.marks, color };
    return withMarks(span, marks);
  });
}

export function setDocumentFontFamily(
  doc: RichTextDocument,
  fontFamily: TextFontFamily | null,
): RichTextDocument {
  if (fontFamily !== null && !TEXT_FONT_FAMILIES.includes(fontFamily)) {
    throw new Error(`Unknown text font family: ${String(fontFamily)}`);
  }

  return mapSpans(doc, (span) => {
    const marks =
      fontFamily === null ? omitStyle(span.marks, 'fontFamily') : { ...span.marks, fontFamily };
    return withMarks(span, marks);
  });
}

export function setDocumentFontSize(
  doc: RichTextDocument,
  fontSize: TextFontSize | null,
): RichTextDocument {
  if (fontSize !== null && !TEXT_FONT_SIZES.includes(fontSize)) {
    throw new Error(`Unknown text font size: ${String(fontSize)}`);
  }

  return mapSpans(doc, (span) => {
    const marks = fontSize === null ? omitStyle(span.marks, 'fontSize') : { ...span.marks, fontSize };
    return withMarks(span, marks);
  });
}

export function setDocumentAlign(doc: RichTextDocument, align: TextAlign): RichTextDocument {
  if (!isTextAlign(align)) {
    throw new Error(`Unknown text align: ${String(align)}`);
  }

  return {
    blocks: doc.blocks.map((block) => (block.align === align ? block : { ...block, align })),
  };
}

export type TextBooleanMarkState = 'on' | 'off' | 'mixed';

export function getDocumentBooleanMarkState(
  doc: RichTextDocument,
  mark: TextBooleanMark,
): TextBooleanMarkState {
  let sawTrue = false;
  let sawFalse = false;

  for (const block of doc.blocks) {
    for (const span of block.spans) {
      if (span.marks?.[mark] === true) {
        sawTrue = true;
      } else {
        sawFalse = true;
      }
    }
  }

  if (sawTrue && sawFalse) {
    return 'mixed';
  }
  return sawTrue ? 'on' : 'off';
}

export function getDocumentColor(doc: RichTextDocument): string | undefined {
  return uniformSpanValue(doc, (marks) => marks?.color);
}

export function getDocumentFontFamily(doc: RichTextDocument): TextFontFamily | undefined {
  return uniformSpanValue(doc, (marks) => marks?.fontFamily);
}

export function getDocumentFontSize(doc: RichTextDocument): TextFontSize | undefined {
  return uniformSpanValue(doc, (marks) => marks?.fontSize);
}

export function getDocumentAlign(doc: RichTextDocument): TextAlign | undefined {
  const first = doc.blocks[0]?.align;
  return doc.blocks.every((block) => block.align === first) ? first : undefined;
}

function validateMarks(marks: unknown): void {
  if (!isRecord(marks)) {
    throw new Error('Rich text content span "marks" must be an object');
  }

  for (const key of ['bold', 'underline', 'strikethrough'] as const) {
    if (marks[key] !== undefined && typeof marks[key] !== 'boolean') {
      throw new Error(`Rich text content mark "${key}" must be a boolean`);
    }
  }

  if (marks.color !== undefined) {
    if (typeof marks.color !== 'string' || !HEX_COLOR_PATTERN.test(marks.color)) {
      throw new Error('Rich text content mark "color" must be a hex color like #ff0000');
    }
  }

  if (marks.fontFamily !== undefined && !TEXT_FONT_FAMILIES.includes(marks.fontFamily as never)) {
    throw new Error('Rich text content mark "fontFamily" is not a known font family');
  }

  if (marks.fontSize !== undefined && !TEXT_FONT_SIZES.includes(marks.fontSize as never)) {
    throw new Error('Rich text content mark "fontSize" is not a known font size');
  }
}

function isTextAlign(value: unknown): value is TextAlign {
  return typeof value === 'string' && (TEXT_ALIGNS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function applyBooleanMark(
  marks: RichTextMarks | undefined,
  mark: TextBooleanMark,
  enabled: boolean,
): RichTextMarks | undefined {
  const next: RichTextMarks = { ...marks };

  const withFlag: Record<TextBooleanMark, boolean | undefined> = {
    bold: next.bold,
    underline: next.underline,
    strikethrough: next.strikethrough,
  };
  withFlag[mark] = enabled;

  return normalizeMarks({
    ...next,
    bold: withFlag.bold,
    underline: withFlag.underline,
    strikethrough: withFlag.strikethrough,
  });
}

function omitStyle(
  marks: RichTextMarks | undefined,
  key: 'color' | 'fontFamily' | 'fontSize',
): RichTextMarks | undefined {
  const next: Record<string, unknown> = { ...marks };
  delete next[key];
  return normalizeMarks(next as RichTextMarks);
}

function withMarks(span: RichTextSpan, marks: RichTextMarks | undefined): RichTextSpan {
  return marks === undefined ? { text: span.text } : { text: span.text, marks };
}

function normalizeMarks(marks: RichTextMarks): RichTextMarks | undefined {
  const normalized: {
    -readonly [K in keyof RichTextMarks]?: RichTextMarks[K];
  } = {};

  if (marks.bold === true) normalized.bold = true;
  if (marks.underline === true) normalized.underline = true;
  if (marks.strikethrough === true) normalized.strikethrough = true;
  if (marks.color !== undefined) normalized.color = marks.color;
  if (marks.fontFamily !== undefined) normalized.fontFamily = marks.fontFamily;
  if (marks.fontSize !== undefined) normalized.fontSize = marks.fontSize;

  return Object.keys(normalized).length === 0 ? undefined : normalized;
}

function mapSpans(
  doc: RichTextDocument,
  map: (span: RichTextSpan) => RichTextSpan,
): RichTextDocument {
  return {
    blocks: doc.blocks.map((block) => ({
      ...block,
      spans: mergeSpans(block.spans.map(map)),
    })),
  };
}

function mergeSpans(spans: readonly RichTextSpan[]): readonly RichTextSpan[] {
  const merged: RichTextSpan[] = [];

  for (const span of spans) {
    if (span.text.length === 0) {
      continue;
    }

    const previous = merged[merged.length - 1];

    if (previous !== undefined && sameMarks(previous.marks, span.marks)) {
      merged[merged.length - 1] = { text: previous.text + span.text, marks: previous.marks };
      continue;
    }

    merged.push(span);
  }

  return merged;
}

function sameMarks(a: RichTextMarks | undefined, b: RichTextMarks | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function uniformSpanValue<T>(
  doc: RichTextDocument,
  read: (marks: RichTextMarks | undefined) => T | undefined,
): T | undefined {
  let found: T | undefined;
  let seen = false;

  for (const block of doc.blocks) {
    for (const span of block.spans) {
      if (span.text.length === 0) {
        continue;
      }

      const value = read(span.marks);

      if (!seen) {
        found = value;
        seen = true;
        continue;
      }

      if (found !== value) {
        return undefined;
      }
    }
  }

  return seen ? found : undefined;
}

function normalizeRichTextDocument(doc: RichTextDocument): RichTextDocument {
  return {
    blocks: doc.blocks.map((block) => ({
      type: 'paragraph' as const,
      align: block.align,
      spans: mergeSpans(block.spans),
    })),
  };
}
