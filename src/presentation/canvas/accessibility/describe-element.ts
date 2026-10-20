import {
  ELEMENT_TYPES,
  connectorSourceEndpoint,
  connectorTargetEndpoint,
  richTextToPlain,
} from '../../../domain/element';
import type { ConnectorEndpoint } from '../../../domain/element';
import type { Element, ElementType, TaskStatus } from '../../../domain/element';
import { isTaskOverdue } from '../../../application/services';

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'to do',
  in_progress: 'in progress',
  completed: 'completed',
  blocked: 'blocked',
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
      return contentLabel('text', richTextToPlain(element.content));
    case 'note':
      return contentLabel('note', richTextToPlain(element.content));
    case 'task':
      return contentLabel('task', richTextToPlain(element.title));
    case 'frame':
      return contentLabel('frame', richTextToPlain(element.title));
    case 'link':
      return contentLabel(
        'link',
        element.title === undefined ? element.url : richTextToPlain(element.title),
      );
    case 'connector':
      return 'connector';
    default: {
      const unknown: never = element;
      return `element ${JSON.stringify(unknown)}`;
    }
  }
}

function describeConnectorEndpoint(
  endpoint: ConnectorEndpoint,
  elements: readonly Element[],
  connectorPosition: Element['position'],
): string {
  if (endpoint.kind === 'point') {
    const world = endpoint.point.add(connectorPosition);
    return `point ${Math.round(world.x)}, ${Math.round(world.y)}`;
  }

  const referenced = elements.find((candidate) => candidate.id.value === endpoint.elementId.value);

  return referenced === undefined ? endpoint.elementId.value : referenceLabel(referenced);
}

/**
 * Human-readable, screen-reader friendly name for a canvas element.
 *
 * Pure and React-free so it can be unit-tested and shared. When the full board
 * is provided, connector endpoints are resolved to the referenced element's
 * label instead of exposing raw ids.
 */
export function describeElement(
  element: Element,
  elements: readonly Element[] = [],
  now: Date = new Date(),
): string {
  switch (element.type) {
    case 'text':
      return contentLabel('Text', richTextToPlain(element.content));
    case 'note':
      return contentLabel('Note', richTextToPlain(element.content));
    case 'task': {
      const parts = [
        `Task: ${truncate(richTextToPlain(element.title))}`,
        TASK_STATUS_LABELS[element.status],
      ];

      if (element.dueDate !== undefined) {
        const due = element.dueDate.toISOString().slice(0, 10);
        const overdue = element.status !== 'completed' && isTaskOverdue(element.dueDate, now);

        parts.push(overdue ? `overdue (due ${due})` : `due ${due}`);
      }

      return parts.join(', ');
    }
    case 'frame':
      return contentLabel('Frame', richTextToPlain(element.title));
    case 'connector': {
      const from = describeConnectorEndpoint(
        connectorSourceEndpoint(element),
        elements,
        element.position,
      );
      const to = describeConnectorEndpoint(
        connectorTargetEndpoint(element),
        elements,
        element.position,
      );

      return `Connector from ${from} to ${to}`;
    }
    case 'link':
      return contentLabel(
        'Link',
        element.title === undefined ? element.url : richTextToPlain(element.title),
      );
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
