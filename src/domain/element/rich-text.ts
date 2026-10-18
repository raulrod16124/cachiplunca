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

export const TEXT_BOOLEAN_MARKS = [
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'highlight',
] as const;

export type TextBooleanMark = (typeof TEXT_BOOLEAN_MARKS)[number];

export const DEFAULT_TEXT_ALIGN: TextAlign = 'left';

export const RICH_TEXT_LIMITS = {
  maxBlocks: 200,
  maxSpansPerBlock: 2000,
  maxTextLength: 100_000,
  maxListDepth: 10,
} as const;

export interface RichTextMarks {
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly strikethrough?: boolean;
  readonly highlight?: boolean;
  readonly color?: string;
  readonly fontFamily?: TextFontFamily;
  readonly fontSize?: TextFontSize;
}

export interface RichTextSpan {
  readonly text: string;
  readonly marks?: RichTextMarks;
}

export interface RichTextParagraphBlock {
  readonly type: 'paragraph';
  readonly align: TextAlign;
  readonly spans: readonly RichTextSpan[];
}

export interface RichTextHeadingBlock {
  readonly type: 'heading';
  readonly level: 1 | 2 | 3;
  readonly align: TextAlign;
  readonly spans: readonly RichTextSpan[];
}

export interface RichTextBulletListBlock {
  readonly type: 'bulletList';
  readonly items: readonly RichTextListItem[];
}

export interface RichTextOrderedListBlock {
  readonly type: 'orderedList';
  readonly items: readonly RichTextListItem[];
}

export type RichTextListBlock = RichTextBulletListBlock | RichTextOrderedListBlock;

export interface RichTextListItem {
  readonly type: 'listItem';
  readonly content: readonly RichTextListItemContentBlock[];
}

export type RichTextListItemContentBlock =
  RichTextParagraphBlock | RichTextHeadingBlock | RichTextListBlock;

export type RichTextBlock = RichTextParagraphBlock | RichTextHeadingBlock | RichTextListBlock;

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
  return doc.blocks.map((block) => blockToPlain(block)).join('\n');
}

function blockToPlain(block: RichTextBlock): string {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
      return block.spans.map((span) => span.text).join('');
    case 'bulletList':
    case 'orderedList':
      return block.items.map((item) => listItemToPlain(item)).join('\n');
  }
}

function listItemToPlain(item: RichTextListItem): string {
  return item.content.map((block) => blockToPlain(block)).join('\n');
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
    throw new Error('Rich text content must be a rich text document');
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
    totalLength += validateBlock(block, 0, totalLength);
  }

  if (totalLength > RICH_TEXT_LIMITS.maxTextLength) {
    throw new Error(
      `Rich text content cannot exceed ${RICH_TEXT_LIMITS.maxTextLength} characters (${totalLength} given)`,
    );
  }
}

function validateBlock(block: unknown, depth: number, runningLength: number): number {
  if (!isRecord(block)) {
    throw new Error('Rich text content blocks must be objects');
  }

  if (depth > RICH_TEXT_LIMITS.maxListDepth) {
    throw new Error(
      `Rich text content list nesting cannot exceed ${RICH_TEXT_LIMITS.maxListDepth} levels`,
    );
  }

  switch (block.type) {
    case 'paragraph':
      return validateInlineBlock(block, runningLength);
    case 'heading':
      return validateHeadingBlock(block, runningLength);
    case 'bulletList':
    case 'orderedList':
      return validateListBlock(block, depth, runningLength);
    default:
      throw new Error(
        'Rich text content blocks must be paragraph, heading, bulletList or orderedList',
      );
  }
}

function validateInlineBlock(block: Record<string, unknown>, runningLength: number): number {
  if (!isTextAlign(block.align)) {
    throw new Error('Rich text content block "align" must be left, center, right or justify');
  }

  return validateSpans(block.spans, runningLength);
}

function validateHeadingBlock(block: Record<string, unknown>, runningLength: number): number {
  if (!isHeadingLevel(block.level)) {
    throw new Error('Rich text content heading "level" must be 1, 2 or 3');
  }

  return validateInlineBlock(block, runningLength);
}

function validateListBlock(
  block: Record<string, unknown>,
  depth: number,
  runningLength: number,
): number {
  const { items } = block;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Rich text content list "items" must be a non-empty array');
  }

  let totalLength = 0;

  for (const item of items) {
    totalLength += validateListItem(item, depth + 1, runningLength + totalLength);
  }

  return totalLength;
}

function validateListItem(item: unknown, depth: number, runningLength: number): number {
  if (!isRecord(item) || item.type !== 'listItem') {
    throw new Error('Rich text content list items must be of type "listItem"');
  }

  const { content } = item;

  if (!Array.isArray(content) || content.length === 0) {
    throw new Error('Rich text content list item "content" must be a non-empty array');
  }

  let totalLength = 0;

  for (const child of content) {
    totalLength += validateBlock(child, depth, runningLength + totalLength);
  }

  return totalLength;
}

function validateSpans(spans: unknown, runningLength: number): number {
  if (!Array.isArray(spans)) {
    throw new Error('Rich text content block "spans" must be an array');
  }

  if (spans.length > RICH_TEXT_LIMITS.maxSpansPerBlock) {
    throw new Error(
      `Rich text content blocks cannot exceed ${RICH_TEXT_LIMITS.maxSpansPerBlock} spans`,
    );
  }

  let totalLength = 0;

  for (const span of spans) {
    if (!isRecord(span) || typeof span.text !== 'string') {
      throw new Error('Rich text content spans must have a string "text"');
    }

    totalLength += span.text.length;

    const combinedLength = runningLength + totalLength;

    if (combinedLength > RICH_TEXT_LIMITS.maxTextLength) {
      throw new Error(
        `Rich text content cannot exceed ${RICH_TEXT_LIMITS.maxTextLength} characters`,
      );
    }

    if (span.marks !== undefined) {
      validateMarks(span.marks);
    }
  }

  return totalLength;
}

export function isSingleInlineBlockDocument(doc: RichTextDocument): boolean {
  if (doc.blocks.length !== 1) {
    return false;
  }

  const block = doc.blocks[0];

  return block.type === 'paragraph' || block.type === 'heading';
}

export function validateTitleDocument(doc: RichTextDocument): void {
  if (doc.blocks.length !== 1) {
    throw new Error('Title must contain exactly one block');
  }

  const block = doc.blocks[0];

  if (block.type !== 'paragraph' && block.type !== 'heading') {
    throw new Error('Title must be a paragraph or heading');
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
    const marks =
      fontSize === null ? omitStyle(span.marks, 'fontSize') : { ...span.marks, fontSize };
    return withMarks(span, marks);
  });
}

export function setDocumentAlign(doc: RichTextDocument, align: TextAlign): RichTextDocument {
  if (!isTextAlign(align)) {
    throw new Error(`Unknown text align: ${String(align)}`);
  }

  return {
    blocks: doc.blocks.map((block) => setBlockAlign(block, align)),
  };
}

function setBlockAlign(block: RichTextBlock, align: TextAlign): RichTextBlock {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
      return block.align === align ? block : { ...block, align };
    case 'bulletList':
    case 'orderedList':
      return { ...block, items: block.items.map((item) => setListItemAlign(item, align)) };
  }
}

function setListItemAlign(item: RichTextListItem, align: TextAlign): RichTextListItem {
  return { ...item, content: item.content.map((block) => setBlockAlign(block, align)) };
}

export type TextBooleanMarkState = 'on' | 'off' | 'mixed';

export function getDocumentBooleanMarkState(
  doc: RichTextDocument,
  mark: TextBooleanMark,
): TextBooleanMarkState {
  let sawTrue = false;
  let sawFalse = false;

  forEachSpan(doc, (span) => {
    if (span.marks?.[mark] === true) {
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
  const alignments: TextAlign[] = [];

  forEachInlineBlock(doc, (block) => {
    alignments.push(block.align);
  });

  if (alignments.length === 0) {
    return undefined;
  }

  const first = alignments[0];
  return alignments.every((align) => align === first) ? first : undefined;
}

function validateMarks(marks: unknown): void {
  if (!isRecord(marks)) {
    throw new Error('Rich text content span "marks" must be an object');
  }

  for (const key of TEXT_BOOLEAN_MARKS) {
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

function isHeadingLevel(value: unknown): value is 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3;
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
    italic: next.italic,
    underline: next.underline,
    strikethrough: next.strikethrough,
    highlight: next.highlight,
  };
  withFlag[mark] = enabled;

  return normalizeMarks({
    ...next,
    bold: withFlag.bold,
    italic: withFlag.italic,
    underline: withFlag.underline,
    strikethrough: withFlag.strikethrough,
    highlight: withFlag.highlight,
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
  if (marks.italic === true) normalized.italic = true;
  if (marks.underline === true) normalized.underline = true;
  if (marks.strikethrough === true) normalized.strikethrough = true;
  if (marks.highlight === true) normalized.highlight = true;
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
    blocks: doc.blocks.map((block) => mapBlockSpans(block, map)),
  };
}

function mapBlockSpans(
  block: RichTextBlock,
  map: (span: RichTextSpan) => RichTextSpan,
): RichTextBlock {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
      return { ...block, spans: mergeSpans(block.spans.map(map)) };
    case 'bulletList':
    case 'orderedList':
      return { ...block, items: block.items.map((item) => mapListItemSpans(item, map)) };
  }
}

function mapListItemSpans(
  item: RichTextListItem,
  map: (span: RichTextSpan) => RichTextSpan,
): RichTextListItem {
  return {
    ...item,
    content: item.content.map((block) => mapBlockSpans(block, map)),
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

function forEachSpan(doc: RichTextDocument, visit: (span: RichTextSpan) => void): void {
  for (const block of doc.blocks) {
    forEachSpanInBlock(block, visit);
  }
}

function forEachSpanInBlock(block: RichTextBlock, visit: (span: RichTextSpan) => void): void {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
      for (const span of block.spans) {
        visit(span);
      }
      break;
    case 'bulletList':
    case 'orderedList':
      for (const item of block.items) {
        forEachSpanInListItem(item, visit);
      }
      break;
  }
}

function forEachSpanInListItem(item: RichTextListItem, visit: (span: RichTextSpan) => void): void {
  for (const block of item.content) {
    forEachSpanInBlock(block, visit);
  }
}

function forEachInlineBlock(
  doc: RichTextDocument,
  visit: (block: RichTextParagraphBlock | RichTextHeadingBlock) => void,
): void {
  for (const block of doc.blocks) {
    forEachInlineBlockInBlock(block, visit);
  }
}

function forEachInlineBlockInBlock(
  block: RichTextBlock,
  visit: (block: RichTextParagraphBlock | RichTextHeadingBlock) => void,
): void {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
      visit(block);
      break;
    case 'bulletList':
    case 'orderedList':
      for (const item of block.items) {
        forEachInlineBlockInListItem(item, visit);
      }
      break;
  }
}

function forEachInlineBlockInListItem(
  item: RichTextListItem,
  visit: (block: RichTextParagraphBlock | RichTextHeadingBlock) => void,
): void {
  for (const block of item.content) {
    forEachInlineBlockInBlock(block, visit);
  }
}

function uniformSpanValue<T>(
  doc: RichTextDocument,
  read: (marks: RichTextMarks | undefined) => T | undefined,
): T | undefined {
  let found: T | undefined;
  let seen = false;

  forEachSpan(doc, (span) => {
    if (span.text.length === 0) {
      return;
    }

    const value = read(span.marks);

    if (!seen) {
      found = value;
      seen = true;
      return;
    }

    if (found !== value) {
      found = undefined;
    }
  });

  return seen ? found : undefined;
}

function normalizeRichTextDocument(doc: RichTextDocument): RichTextDocument {
  return {
    blocks: doc.blocks.map((block) => normalizeBlock(block)),
  };
}

function normalizeBlock(block: RichTextBlock): RichTextBlock {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
      return { ...block, spans: mergeSpans(block.spans) };
    case 'bulletList':
    case 'orderedList':
      return { ...block, items: block.items.map((item) => normalizeListItem(item)) };
  }
}

function normalizeListItem(item: RichTextListItem): RichTextListItem {
  return {
    ...item,
    content: item.content.map((block) => normalizeBlock(block)),
  };
}
