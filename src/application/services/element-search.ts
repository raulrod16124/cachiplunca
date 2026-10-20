import { richTextToPlain } from '../../domain/element';
import type { Element } from '../../domain/element';
import { matchesSearchText } from './text-search';

export const ELEMENT_SEARCH_RESULT_LIMIT = 8;

export function elementSearchText(element: Element): string {
  switch (element.type) {
    case 'text':
    case 'note':
      return richTextToPlain(element.content);
    case 'task': {
      const notes = element.notes === undefined ? '' : richTextToPlain(element.notes);

      return [richTextToPlain(element.title), notes].filter((value) => value.length > 0).join(' ');
    }
    case 'frame':
      return richTextToPlain(element.title);
    case 'link': {
      const title = element.title === undefined ? '' : richTextToPlain(element.title);

      return [title, element.url].filter((value) => value.length > 0).join(' ');
    }
    case 'connector':
      return '';
    default: {
      const unknown: never = element;
      return String(unknown);
    }
  }
}

export function searchElements(
  elements: readonly Element[],
  query: string,
  limit = ELEMENT_SEARCH_RESULT_LIMIT,
): readonly Element[] {
  if (limit <= 0) {
    return [];
  }

  const matches: Element[] = [];

  for (const element of elements) {
    if (matches.length >= limit) {
      break;
    }

    if (element.type === 'connector') {
      continue;
    }

    if (matchesSearchText(elementSearchText(element), query)) {
      matches.push(element);
    }
  }

  return matches;
}
