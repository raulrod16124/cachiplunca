import type { UpdateElementInput } from '../../../application/commands';
import {
  isFrameElement,
  isLinkElement,
  isNoteElement,
  isTaskElement,
  isTextElement,
  richTextFromPlain,
  richTextToPlain,
} from '../../../domain/element';
import type {
  Element,
  RichTextBlock,
  RichTextDocument,
  RichTextHeadingBlock,
  RichTextParagraphBlock,
} from '../../../domain/element';

export type EditableRichTextElement =
  | Extract<Element, { readonly type: 'text' }>
  | Extract<Element, { readonly type: 'note' }>
  | Extract<Element, { readonly type: 'task' }>
  | Extract<Element, { readonly type: 'frame' }>
  | Extract<Element, { readonly type: 'link' }>;

export type EditableRichTextField = 'content' | 'title';

export interface EditableRichTextTarget {
  readonly element: EditableRichTextElement;
  readonly field: EditableRichTextField;
  readonly document: RichTextDocument;
  readonly singleLine: boolean;
}

type InlineBlock = RichTextParagraphBlock | RichTextHeadingBlock;

const EMPTY_PARAGRAPH: RichTextParagraphBlock = {
  type: 'paragraph',
  align: 'left',
  spans: [],
};

export function getEditableRichTextTarget(
  element: Element | null | undefined,
): EditableRichTextTarget | null {
  if (element === null || element === undefined) {
    return null;
  }

  if (isTextElement(element)) {
    return { element, field: 'content', document: element.content, singleLine: false };
  }

  if (isNoteElement(element)) {
    return { element, field: 'content', document: element.content, singleLine: false };
  }

  if (isTaskElement(element)) {
    return { element, field: 'title', document: element.title, singleLine: true };
  }

  if (isFrameElement(element)) {
    return { element, field: 'title', document: element.title, singleLine: true };
  }

  if (isLinkElement(element)) {
    return {
      element,
      field: 'title',
      document: element.title ?? richTextFromPlain(''),
      singleLine: true,
    };
  }

  return null;
}

export function toUpdateElementInput(
  target: EditableRichTextTarget,
  document: RichTextDocument,
): UpdateElementInput {
  const { element } = target;

  switch (element.type) {
    case 'text':
      return { type: 'text', element, content: document };
    case 'note':
      return { type: 'note', element, content: document };
    case 'task':
      return { type: 'task', element, title: document };
    case 'frame':
      return { type: 'frame', element, title: document };
    case 'link':
      return {
        type: 'link',
        element,
        title: richTextToPlain(document).trim().length === 0 ? null : document,
      };
  }
}

export function normalizeSingleLineDocument(document: RichTextDocument): RichTextDocument {
  const first = document.blocks[0];

  if (document.blocks.length === 1 && isInlineBlock(first)) {
    return document;
  }

  return { blocks: [firstInlineBlock(first)] };
}

function firstInlineBlock(block: RichTextBlock | undefined): InlineBlock {
  if (block === undefined) {
    return EMPTY_PARAGRAPH;
  }

  if (isInlineBlock(block)) {
    return block;
  }

  const firstItem = block.items[0];

  if (firstItem === undefined) {
    return EMPTY_PARAGRAPH;
  }

  return firstInlineBlock(firstItem.content[0]);
}

function isInlineBlock(block: RichTextBlock | undefined): block is InlineBlock {
  return block !== undefined && (block.type === 'paragraph' || block.type === 'heading');
}
