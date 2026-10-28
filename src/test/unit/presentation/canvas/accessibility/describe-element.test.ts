import {
  createConnectorElement,
  createFrameElement,
  createLinkElement,
  createNoteElement,
  createTaskElement,
  createTextElement,
} from '../../../../../domain/element';
import type { Element } from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import { describeBoard, describeElement } from '../../../../../presentation/canvas/accessibility';
import { translate } from '../../../../../presentation/i18n';

const tEs = (
  key: Parameters<typeof translate>[1],
  params?: Readonly<Record<string, string | number>>,
) => translate('es', key, params);

const WORKSPACE = WorkspaceId.create('ws-1');
const USER = UserId.create('user-1');

const POSITION = Position.create(0, 0);
const SIZE = Size.create(100, 100);

function base(id: string) {
  return {
    id: ElementId.create(id),
    workspaceId: WORKSPACE,
    createdBy: USER,
    position: POSITION,
    size: SIZE,
  };
}

const text = createTextElement({ ...base('text'), content: 'Hello  world' });
const note = createNoteElement({ ...base('note'), content: 'A note' });
const task = createTaskElement({ ...base('task'), title: 'Ship it', status: 'in_progress' });
const frame = createFrameElement({ ...base('frame'), title: 'Roadmap' });
const link = createLinkElement({ ...base('link'), url: 'https://example.com' });
const titledLink = createLinkElement({
  ...base('link-titled'),
  url: 'https://example.com',
  title: 'Docs',
});
const connector = createConnectorElement({
  ...base('connector'),
  sourceElementId: text.id,
  targetElementId: task.id,
});

describe('describeElement', () => {
  it('describes each element type with its textual content', () => {
    expect(describeElement(text)).toBe('Text: Hello world');
    expect(describeElement(note)).toBe('Note: A note');
    expect(describeElement(task)).toBe('Task: Ship it, in progress');
    expect(describeElement(frame)).toBe('Frame: Roadmap');
    expect(describeElement(link)).toBe('Link: https://example.com');
    expect(describeElement(titledLink)).toBe('Link: Docs');
  });

  it('includes the due date when present', () => {
    const taskWithDue = createTaskElement({
      ...base('task-due'),
      title: 'Deliver',
      status: 'todo',
      dueDate: new Date('2026-03-01T00:00:00.000Z'),
    });

    expect(describeElement(taskWithDue, [], new Date('2026-10-20T12:00:00.000Z'))).toBe(
      'Task: Deliver, to do, overdue (due 2026-03-01)',
    );
    expect(describeElement(taskWithDue, [], new Date('2026-01-20T12:00:00.000Z'))).toBe(
      'Task: Deliver, to do, due 2026-03-01',
    );
  });

  it('falls back to a label with no content instead of an empty name', () => {
    const emptyText = createTextElement({ ...base('empty'), content: '   ' });

    expect(describeElement(emptyText)).toBe('Text');
  });

  it('collapses whitespace and truncates long content', () => {
    const long = createNoteElement({ ...base('long'), content: 'a'.repeat(200) });
    const label = describeElement(long);

    expect(label.startsWith('Note: ')).toBe(true);
    expect(label.endsWith('…')).toBe(true);
    expect(label.length).toBeLessThan(90);
  });

  it('uses raw endpoint ids for connectors when the board is not resolved', () => {
    expect(describeElement(connector)).toBe('Connector from text to task');
  });

  it('resolves connector endpoints to element labels when the board is provided', () => {
    const board: readonly Element[] = [text, task, connector];

    expect(describeElement(connector, board)).toBe(
      'Connector from text: Hello world to task: Ship it',
    );
  });
});

describe('describeBoard', () => {
  it('reports an empty board', () => {
    expect(describeBoard([])).toBe('This board is empty.');
  });

  it('summarizes the board by element type with a stable order', () => {
    const board: readonly Element[] = [text, note, task, frame, link, connector];

    expect(describeBoard(board)).toBe(
      'Board with 6 elements: 1 text, 1 note, 1 task, 1 frame, 1 connector, 1 link.',
    );
  });

  it('uses the singular noun for a single element', () => {
    expect(describeBoard([text])).toBe('Board with 1 element: 1 text.');
  });

  it('describes the board in Spanish when a translator is provided', () => {
    expect(describeBoard([], tEs)).toBe('Este tablero está vacío.');
    expect(describeBoard([text, note, task, connector], tEs)).toBe(
      'Tablero con 4 elementos: 1 texto, 1 nota, 1 tarea, 1 conector.',
    );
    expect(describeBoard([text], tEs)).toBe('Tablero con 1 elemento: 1 texto.');
  });
});

describe('describeElement in Spanish', () => {
  it('localizes element labels, task status and connector references', () => {
    expect(describeElement(text, [], new Date(), tEs)).toBe('Texto: Hello world');
    expect(describeElement(task, [], new Date(), tEs)).toBe('Tarea: Ship it, en progreso');
    expect(describeElement(connector, [text, task, connector], new Date(), tEs)).toBe(
      'Conector de texto: Hello world a tarea: Ship it',
    );
  });

  it('localizes due and overdue task details', () => {
    const taskWithDue = createTaskElement({
      ...base('task-due-es'),
      title: 'Deliver',
      status: 'todo',
      dueDate: new Date('2026-03-01T00:00:00.000Z'),
    });

    expect(describeElement(taskWithDue, [], new Date('2026-10-20T12:00:00.000Z'), tEs)).toBe(
      'Tarea: Deliver, por hacer, vencida (vence el 2026-03-01)',
    );
    expect(describeElement(taskWithDue, [], new Date('2026-01-20T12:00:00.000Z'), tEs)).toBe(
      'Tarea: Deliver, por hacer, vence el 2026-03-01',
    );
  });
});
