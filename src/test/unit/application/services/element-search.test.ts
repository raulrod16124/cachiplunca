import {
  createConnectorElement,
  createFrameElement,
  createLinkElement,
  createNoteElement,
  createTaskElement,
  createTextElement,
} from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import {
  ELEMENT_SEARCH_RESULT_LIMIT,
  elementSearchText,
  searchElements,
} from '../../../../application/services/element-search';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');
const BASE = {
  workspaceId: WORKSPACE_ID,
  createdBy: USER_ID,
  position: Position.create(0, 0),
  size: Size.create(100, 100),
};

const TEXT = createTextElement({
  ...BASE,
  id: ElementId.create('text-1'),
  content: 'Roadmap Q4',
});

const NOTE = createNoteElement({
  ...BASE,
  id: ElementId.create('note-1'),
  content: 'Ideas de producto',
});

const TASK = createTaskElement({
  ...BASE,
  id: ElementId.create('task-1'),
  title: 'Plan launch',
  status: 'todo',
  notes: 'Ship the MVP',
});

const FRAME = createFrameElement({
  ...BASE,
  id: ElementId.create('frame-1'),
  title: 'Sprint planning',
});

const LINK = createLinkElement({
  ...BASE,
  id: ElementId.create('link-1'),
  url: 'https://example.com/docs',
  title: 'Documentation',
});

const CONNECTOR = createConnectorElement({
  ...BASE,
  id: ElementId.create('connector-1'),
  sourcePoint: Position.create(0, 0),
  targetPoint: Position.create(10, 10),
});

describe('elementSearchText', () => {
  it('returns the plain text of text, note and frame elements', () => {
    expect(elementSearchText(TEXT)).toBe('Roadmap Q4');
    expect(elementSearchText(NOTE)).toBe('Ideas de producto');
    expect(elementSearchText(FRAME)).toBe('Sprint planning');
  });

  it('combines task title and notes', () => {
    expect(elementSearchText(TASK)).toBe('Plan launch Ship the MVP');
  });

  it('combines link titles and urls, falling back to the URL', () => {
    expect(elementSearchText(LINK)).toBe('Documentation https://example.com/docs');
    expect(
      elementSearchText(
        createLinkElement({ ...BASE, id: ElementId.create('link-2'), url: 'https://example.com' }),
      ),
    ).toBe('https://example.com');
  });

  it('returns an empty string for connectors', () => {
    expect(elementSearchText(CONNECTOR)).toBe('');
  });
});

describe('searchElements', () => {
  const elements = [TEXT, NOTE, TASK, FRAME, LINK, CONNECTOR];

  it('matches case and accent-insensitively', () => {
    expect(searchElements(elements, 'roadmap').map((element) => element.id.value)).toEqual([
      'text-1',
    ]);
    expect(
      searchElements(elements, 'ideas de producto').map((element) => element.id.value),
    ).toEqual(['note-1']);
    expect(searchElements(elements, 'PRODUCTO').map((element) => element.id.value)).toEqual([
      'note-1',
    ]);
  });

  it('matches task notes', () => {
    expect(searchElements(elements, 'ship the mvp').map((element) => element.id.value)).toEqual([
      'task-1',
    ]);
  });

  it('matches link titles and urls', () => {
    expect(searchElements(elements, 'documentation').map((element) => element.id.value)).toEqual([
      'link-1',
    ]);
    expect(searchElements(elements, 'example.com').map((element) => element.id.value)).toEqual([
      'link-1',
    ]);
  });

  it('never returns connectors', () => {
    expect(searchElements(elements, 'connector')).toEqual([]);
  });

  it('returns no results for empty queries', () => {
    expect(searchElements(elements, '')).toEqual([]);
    expect(searchElements(elements, '   ')).toEqual([]);
  });

  it('respects the result limit', () => {
    expect(searchElements(elements, 'a', 1)).toHaveLength(1);
    expect(searchElements(elements, 'a', 0)).toEqual([]);
  });

  it('uses a bounded default limit', () => {
    const many = Array.from({ length: ELEMENT_SEARCH_RESULT_LIMIT + 5 }, (_, index) =>
      createTextElement({
        ...BASE,
        id: ElementId.create(`text-${index}`),
        content: `match ${index}`,
      }),
    );

    expect(searchElements(many, 'match')).toHaveLength(ELEMENT_SEARCH_RESULT_LIMIT);
  });
});
