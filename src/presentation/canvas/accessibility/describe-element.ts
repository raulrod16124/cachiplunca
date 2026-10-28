import {
  ELEMENT_TYPES,
  connectorSourceEndpoint,
  connectorTargetEndpoint,
  richTextToPlain,
} from '../../../domain/element';
import type { ConnectorEndpoint } from '../../../domain/element';
import type { Element, ElementType, TaskStatus } from '../../../domain/element';
import { isTaskOverdue } from '../../../application/services';
import { translate } from '../../i18n';
import type { TranslationKey } from '../../i18n';

export type DescribeTranslator = (
  key: TranslationKey,
  params?: Readonly<Record<string, string | number>>,
) => string;

const defaultTranslator: DescribeTranslator = (key, params) => translate('en', key, params);

const TASK_STATUS_LABEL_KEYS: Record<TaskStatus, TranslationKey> = {
  todo: 'canvas.a11y.status.todo',
  in_progress: 'canvas.a11y.status.in_progress',
  completed: 'canvas.a11y.status.completed',
  blocked: 'canvas.a11y.status.blocked',
};

const REFERENCE_LABEL_KEYS: Record<ElementType, TranslationKey> = {
  text: 'canvas.a11y.reference.text',
  note: 'canvas.a11y.reference.note',
  task: 'canvas.a11y.reference.task',
  frame: 'canvas.a11y.reference.frame',
  connector: 'canvas.a11y.reference.connector',
  link: 'canvas.a11y.reference.link',
  image: 'canvas.a11y.reference.image',
};

const ELEMENT_LABEL_KEYS: Record<ElementType, TranslationKey> = {
  text: 'canvas.elementType.text',
  note: 'canvas.elementType.note',
  task: 'canvas.elementType.task',
  frame: 'canvas.elementType.frame',
  connector: 'canvas.elementType.connector',
  link: 'canvas.elementType.link',
  image: 'canvas.elementType.image',
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

function referenceLabel(element: Element, t: DescribeTranslator): string {
  switch (element.type) {
    case 'text':
      return contentLabel(t('canvas.a11y.reference.text'), richTextToPlain(element.content));
    case 'note':
      return contentLabel(t('canvas.a11y.reference.note'), richTextToPlain(element.content));
    case 'task':
      return contentLabel(t('canvas.a11y.reference.task'), richTextToPlain(element.title));
    case 'frame':
      return contentLabel(t('canvas.a11y.reference.frame'), richTextToPlain(element.title));
    case 'link':
      return contentLabel(
        t('canvas.a11y.reference.link'),
        element.title === undefined ? element.url : richTextToPlain(element.title),
      );
    case 'image':
      return contentLabel(t('canvas.a11y.reference.image'), element.alt ?? element.src);
    case 'connector':
      return t('canvas.a11y.reference.connector');
    default: {
      const unknown: never = element;
      return t('canvas.a11y.unknownElement', { json: JSON.stringify(unknown) });
    }
  }
}

function describeConnectorEndpoint(
  endpoint: ConnectorEndpoint,
  elements: readonly Element[],
  connectorPosition: Element['position'],
  t: DescribeTranslator,
): string {
  if (endpoint.kind === 'point') {
    const world = endpoint.point.add(connectorPosition);
    return t('canvas.a11y.point', { x: Math.round(world.x), y: Math.round(world.y) });
  }

  const referenced = elements.find((candidate) => candidate.id.value === endpoint.elementId.value);

  return referenced === undefined ? endpoint.elementId.value : referenceLabel(referenced, t);
}

/**
 * Human-readable, screen-reader friendly name for a canvas element.
 *
 * Pure and React-free so it can be unit-tested and shared. When the full board
 * is provided, connector endpoints are resolved to the referenced element's
 * label instead of exposing raw ids. Text is localized through the injected
 * translator, defaulting to English.
 */
export function describeElement(
  element: Element,
  elements: readonly Element[] = [],
  now: Date = new Date(),
  t: DescribeTranslator = defaultTranslator,
): string {
  switch (element.type) {
    case 'text':
      return contentLabel(t(ELEMENT_LABEL_KEYS.text), richTextToPlain(element.content));
    case 'note':
      return contentLabel(t(ELEMENT_LABEL_KEYS.note), richTextToPlain(element.content));
    case 'task': {
      const parts = [
        t('canvas.a11y.task', {
          title: truncate(richTextToPlain(element.title)),
          status: t(TASK_STATUS_LABEL_KEYS[element.status]),
        }),
      ];

      if (element.dueDate !== undefined) {
        const due = element.dueDate.toISOString().slice(0, 10);
        const overdue = element.status !== 'completed' && isTaskOverdue(element.dueDate, now);

        parts.push(
          overdue
            ? t('canvas.a11y.taskOverdue', { date: due })
            : t('canvas.a11y.taskDue', { date: due }),
        );
      }

      return parts.join(', ');
    }
    case 'frame':
      return contentLabel(t(ELEMENT_LABEL_KEYS.frame), richTextToPlain(element.title));
    case 'connector': {
      const from = describeConnectorEndpoint(
        connectorSourceEndpoint(element),
        elements,
        element.position,
        t,
      );
      const to = describeConnectorEndpoint(
        connectorTargetEndpoint(element),
        elements,
        element.position,
        t,
      );

      return t('canvas.a11y.connector', { from, to });
    }
    case 'link':
      return contentLabel(
        t(ELEMENT_LABEL_KEYS.link),
        element.title === undefined ? element.url : richTextToPlain(element.title),
      );
    case 'image':
      return contentLabel(t(ELEMENT_LABEL_KEYS.image), element.alt ?? element.src);
    default: {
      const unknown: never = element;
      return t('canvas.a11y.unknownElement', { json: JSON.stringify(unknown) });
    }
  }
}

/**
 * Minimal textual alternative for the whole board: a concise, scalable summary
 * by element type used as the canvas `aria-describedby` description.
 */
export function describeBoard(
  elements: readonly Element[],
  t: DescribeTranslator = defaultTranslator,
): string {
  if (elements.length === 0) {
    return t('canvas.a11y.boardEmpty');
  }

  const counts = new Map<ElementType, number>();

  for (const element of elements) {
    counts.set(element.type, (counts.get(element.type) ?? 0) + 1);
  }

  const breakdown = ELEMENT_TYPES.filter((type) => counts.has(type))
    .map((type) => `${counts.get(type)} ${t(REFERENCE_LABEL_KEYS[type])}`)
    .join(', ');

  const nounKey: TranslationKey =
    elements.length === 1 ? 'canvas.a11y.boardElement' : 'canvas.a11y.boardElements';

  return t('canvas.a11y.boardSummary', {
    count: elements.length,
    noun: t(nounKey),
    breakdown,
  });
}
