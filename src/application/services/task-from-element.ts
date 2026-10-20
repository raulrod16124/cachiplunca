import { Position } from '../../domain/shared';
import { isFrameElement, isNoteElement, richTextToPlain } from '../../domain/element';
import type { Element, RichTextDocument } from '../../domain/element';

export const TASK_FROM_ELEMENT_TITLE_MAX_LENGTH = 120;
export const TASK_FROM_ELEMENT_OFFSET = 24;

export interface TaskDraftFromElement {
  readonly title: string;
  readonly notes?: RichTextDocument;
}

export function taskDraftFromElement(element: Element): TaskDraftFromElement | null {
  const sourceDocument = sourceTitleOrContent(element);

  if (sourceDocument === null) {
    return null;
  }

  const plain = normalizeTitleText(richTextToPlain(sourceDocument));

  if (plain.length === 0) {
    return null;
  }

  if (plain.length <= TASK_FROM_ELEMENT_TITLE_MAX_LENGTH) {
    return { title: plain };
  }

  return {
    title: `${plain.slice(0, TASK_FROM_ELEMENT_TITLE_MAX_LENGTH).trimEnd()}…`,
    notes: sourceDocument,
  };
}

export function taskPositionFromElement(source: Element): Position {
  return Position.create(
    source.position.x + source.size.width + TASK_FROM_ELEMENT_OFFSET,
    source.position.y,
  );
}

function sourceTitleOrContent(element: Element): RichTextDocument | null {
  if (isNoteElement(element)) {
    return element.content;
  }

  if (isFrameElement(element)) {
    return element.title;
  }

  return null;
}

function normalizeTitleText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
