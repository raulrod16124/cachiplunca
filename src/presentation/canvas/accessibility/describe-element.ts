import { ELEMENT_TYPES } from '../../../domain/element';
import type { Element, ElementType, TaskStatus } from '../../../domain/element';

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'to do',
  in_progress: 'in progress',
  done: 'done',
};

const ELEMENT_TYPE_LABELS: Record<ElementType, string> = {
  text: 'text',
  note: 'note',
  task: 'task',
  frame: 'frame',
  connector: 'connector',
  link: 'link',
};

const CONTENT_MAX_LENGTH = 80;

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function truncate(text: string): string {
  const normalized = normalize(text);

  if (normalized.length <= CONTENT_MAX_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, CONTENT_MAX_LENGTH - 1).trimEnd()}…`;
}

function contentLabel(prefix: string, content: string): string {
  const trimmed = truncate(content);

  return trimmed.length === 0 ? prefix : `${prefix}: ${trimmed}`;
}

function referenceLabel(element: Element): string {
  switch (element.type) {
    case 'text':
      return contentLabel('text', element.content);
    case 'note':
      return contentLabel('note', element.content);
    case 'task':
      return contentLabel('task', element.title);
    case 'frame':
      return contentLabel('frame', element.title);
    case 'link':
      return contentLabel('link', element.title ?? element.url);
    case 'connector':
      return 'connector';
    default: {
      const unknown: never = element;
      return `element ${JSON.stringify(unknown)}`;
    }
  }
}

function resolveReference(id: string, elements: readonly Element[]): string {
  const referenced = elements.find((candidate) => candidate.id.value === id);

  return referenced === undefined ? id : referenceLabel(referenced);
}

/**
 * Human-readable, screen-reader friendly name for a canvas element.
 *
 * Pure and React-free so it can be unit-tested and shared. When the full board
 * is provided, connector endpoints are resolved to the referenced element's
 * label instead of exposing raw ids.
 */
export function describeElement(element: Element, elements: readonly Element[] = []): string {
  switch (element.type) {
    case 'text':
      return contentLabel('Text', element.content);
    case 'note':
      return contentLabel('Note', element.content);
    case 'task': {
      const parts = [`Task: ${truncate(element.title)}`, TASK_STATUS_LABELS[element.status]];

      if (element.dueDate !== undefined) {
        parts.push(`due ${element.dueDate.toISOString().slice(0, 10)}`);
      }

      return parts.join(', ');
    }
    case 'frame':
      return contentLabel('Frame', element.title);
    case 'connector': {
      const from = resolveReference(element.sourceElementId.value, elements);
      const to = resolveReference(element.targetElementId.value, elements);

      return `Connector from ${from} to ${to}`;
    }
    case 'link':
      return contentLabel('Link', element.title ?? element.url);
    default: {
      const unknown: never = element;
      return `Element ${JSON.stringify(unknown)}`;
    }
  }
}

/**
 * Minimal textual alternative for the whole board: a concise, scalable summary
 * by element type used as the canvas `aria-describedby` description.
 */
export function describeBoard(elements: readonly Element[]): string {
  if (elements.length === 0) {
    return 'This board is empty.';
  }

  const counts = new Map<ElementType, number>();

  for (const element of elements) {
    counts.set(element.type, (counts.get(element.type) ?? 0) + 1);
  }

  const breakdown = ELEMENT_TYPES.filter((type) => counts.has(type))
    .map((type) => `${counts.get(type)} ${ELEMENT_TYPE_LABELS[type]}`)
    .join(', ');

  const noun = elements.length === 1 ? 'element' : 'elements';

  return `Board with ${elements.length} ${noun}: ${breakdown}.`;
}
