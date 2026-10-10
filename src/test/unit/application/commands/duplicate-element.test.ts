import {
  createDuplicateElement,
  type DuplicateElementInput,
} from '../../../../application/commands';
import {
  createConnectorElement,
  createFrameElement,
  createLinkElement,
  createNoteElement,
  createTaskElement,
  createTextElement,
  type ConnectorElement,
  type Element,
  type FrameElement,
  type LinkElement,
  type NoteElement,
  type TaskElement,
  type TextElement,
} from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';

const CREATED_AT = new Date('2024-01-01T00:00:00Z');
const FIXED_NOW = new Date('2024-06-01T00:00:00Z');

const baseProps = {
  workspaceId: WorkspaceId.create('ws-1'),
  createdBy: UserId.create('user-1'),
  position: Position.create(10, 20),
  size: Size.create(100, 40),
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

const textElement = (overrides: Partial<TextElement> = {}): TextElement =>
  createTextElement({
    ...baseProps,
    id: ElementId.create('elem-1'),
    content: 'hello',
    ...overrides,
  });

const noteElement = (overrides: Partial<NoteElement> = {}): NoteElement =>
  createNoteElement({
    ...baseProps,
    id: ElementId.create('note-1'),
    content: 'idea',
    ...overrides,
  });

const taskElement = (overrides: Partial<TaskElement> = {}): TaskElement =>
  createTaskElement({
    ...baseProps,
    id: ElementId.create('task-1'),
    title: 'Ship it',
    status: 'todo',
    ...overrides,
  });

const frameElement = (overrides: Partial<FrameElement> = {}): FrameElement =>
  createFrameElement({
    ...baseProps,
    id: ElementId.create('frame-1'),
    title: 'Phase 1',
    ...overrides,
  });

const connectorElement = (overrides: Partial<ConnectorElement> = {}): ConnectorElement =>
  createConnectorElement({
    ...baseProps,
    id: ElementId.create('connector-1'),
    sourceElementId: ElementId.create('a'),
    targetElementId: ElementId.create('b'),
    ...overrides,
  });

const linkElement = (overrides: Partial<LinkElement> = {}): LinkElement =>
  createLinkElement({
    ...baseProps,
    id: ElementId.create('link-1'),
    url: 'https://example.com',
    ...overrides,
  });

const allElements = (): Element[] => [
  textElement(),
  noteElement(),
  taskElement(),
  frameElement(),
  connectorElement(),
  linkElement(),
];

const makeCommand = (): ReturnType<typeof createDuplicateElement> =>
  createDuplicateElement({
    generateId: () => ElementId.create('copy-1'),
    now: () => FIXED_NOW,
  });

const expectOk = (input: DuplicateElementInput): Element => {
  const result = makeCommand()(input);
  if (result.status !== 'ok') {
    throw new Error(`Expected ok, got ${result.status}`);
  }
  return result.element;
};

describe('createDuplicateElement', () => {
  it('duplicates every element type with a new id and timestamps', () => {
    for (const element of allElements()) {
      const copy = expectOk({ element });

      expect(copy).not.toBe(element);
      expect(copy.type).toBe(element.type);
      expect(copy.id.value).toBe('copy-1');
      expect(copy.id.equals(element.id)).toBe(false);
      expect(copy.createdAt).toBe(FIXED_NOW);
      expect(copy.updatedAt).toBe(FIXED_NOW);
    }
  });

  it('preserves shared metadata for every element type', () => {
    for (const element of allElements()) {
      const copy = expectOk({ element });

      expect(copy.workspaceId.equals(element.workspaceId)).toBe(true);
      expect(copy.createdBy.equals(element.createdBy)).toBe(true);
      expect(copy.position.equals(element.position)).toBe(true);
      expect(copy.size.equals(element.size)).toBe(true);
      expect(copy.rotation).toBe(element.rotation);
    }
  });

  it('preserves type-specific fields of the source element', () => {
    const task = expectOk({ element: taskElement({ status: 'done' }) });
    expect(task.type).toBe('task');
    if (task.type === 'task') {
      expect(task.title).toBe('Ship it');
      expect(task.status).toBe('done');
    }

    const note = expectOk({ element: noteElement({ color: '#ff0' }) });
    expect(note.type).toBe('note');
    if (note.type === 'note') {
      expect(note.content).toBe('idea');
      expect(note.color).toBe('#ff0');
    }
  });

  it('keeps connector endpoints untouched when duplicating a connector', () => {
    const copy = expectOk({ element: connectorElement() });
    expect(copy.type).toBe('connector');
    if (copy.type === 'connector') {
      expect(copy.sourceElementId.value).toBe('a');
      expect(copy.targetElementId.value).toBe('b');
    }
  });

  it('applies an optional absolute position to the copy', () => {
    const copy = expectOk({
      element: textElement({ position: Position.create(10, 20) }),
      position: Position.create(80, 90),
    });

    expect(copy.position.equals(Position.create(80, 90))).toBe(true);
  });

  it('falls back to the real clock when no now dependency is provided', () => {
    const before = Date.now();
    const command = createDuplicateElement({ generateId: () => ElementId.create('copy-1') });
    const result = command({ element: textElement() });
    const after = Date.now();

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.element.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.element.createdAt.getTime()).toBeLessThanOrEqual(after);
    }
  });

  it('generates a distinct id on each invocation', () => {
    let counter = 0;
    const command = createDuplicateElement({
      generateId: () => ElementId.create(`copy-${++counter}`),
      now: () => FIXED_NOW,
    });

    const first = command({ element: textElement() });
    const second = command({ element: textElement() });

    expect(first.status).toBe('ok');
    expect(second.status).toBe('ok');
    if (first.status === 'ok' && second.status === 'ok') {
      expect(first.element.id.value).toBe('copy-1');
      expect(second.element.id.value).toBe('copy-2');
    }
  });

  it('returns a validation error instead of throwing for an invalid source element', () => {
    const invalid = Object.assign(textElement(), {
      createdAt: new Date('2024-05-01T00:00:00Z'),
    }) as Element;
    const result = makeCommand()({ element: invalid });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
    }
  });

  it('does not mutate the input or the original element', () => {
    const element = textElement();
    const input: DuplicateElementInput = { element, position: Position.create(80, 90) };
    const elementSnapshot = { ...element };
    const inputSnapshot = { ...input };

    makeCommand()(input);

    expect(element).toEqual(elementSnapshot);
    expect(input).toEqual(inputSnapshot);
  });

  it('is stateless: successive calls do not affect each other', () => {
    const command = makeCommand();
    const first = textElement({ id: ElementId.create('elem-1') });
    const second = noteElement({ id: ElementId.create('elem-2') });

    const firstResult = command({ element: first });
    const secondResult = command({ element: second });

    expect(firstResult.status).toBe('ok');
    expect(secondResult.status).toBe('ok');
    if (firstResult.status === 'ok' && secondResult.status === 'ok') {
      expect(firstResult.element.type).toBe('text');
      expect(secondResult.element.type).toBe('note');
    }
  });

  it('is apt for undo/redo: removing the copy by id restores the original store', () => {
    const original = textElement({ id: ElementId.create('elem-1') });
    const copy = expectOk({ element: original });

    const store: Element[] = [original, copy];
    expect(store).toHaveLength(2);

    const afterUndo = store.filter((candidate) => !candidate.id.equals(copy.id));
    expect(afterUndo.map((candidate) => candidate.id.value)).toEqual(['elem-1']);

    const afterRedo = [...afterUndo, copy];
    expect(afterRedo.map((candidate) => candidate.id.value)).toEqual(['elem-1', 'copy-1']);
  });
});
