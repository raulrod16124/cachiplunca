import { createDeleteElement, type DeleteElementInput } from '../../../../application/commands';
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

const baseProps = {
  id: ElementId.create('elem-1'),
  workspaceId: WorkspaceId.create('ws-1'),
  createdBy: UserId.create('user-1'),
  position: Position.create(10, 20),
  size: Size.create(100, 40),
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

const textElement = (overrides: Partial<TextElement> = {}): TextElement =>
  createTextElement({ ...baseProps, content: 'hello', ...overrides });

const noteElement = (overrides: Partial<NoteElement> = {}): NoteElement =>
  createNoteElement({ ...baseProps, content: 'idea', ...overrides });

const taskElement = (overrides: Partial<TaskElement> = {}): TaskElement =>
  createTaskElement({ ...baseProps, title: 'Ship it', status: 'todo', ...overrides });

const frameElement = (overrides: Partial<FrameElement> = {}): FrameElement =>
  createFrameElement({ ...baseProps, title: 'Phase 1', ...overrides });

const connectorElement = (overrides: Partial<ConnectorElement> = {}): ConnectorElement =>
  createConnectorElement({
    ...baseProps,
    sourceElementId: ElementId.create('a'),
    targetElementId: ElementId.create('b'),
    ...overrides,
  });

const linkElement = (overrides: Partial<LinkElement> = {}): LinkElement =>
  createLinkElement({ ...baseProps, url: 'https://example.com', ...overrides });

const allElements = (): Element[] => [
  textElement(),
  noteElement(),
  taskElement(),
  frameElement(),
  connectorElement(),
  linkElement(),
];

const makeCommand = (): ReturnType<typeof createDeleteElement> => createDeleteElement();

const expectOk = (input: DeleteElementInput): Element => {
  const result = makeCommand()(input);
  if (result.status !== 'ok') {
    throw new Error(`Expected ok, got ${result.status}`);
  }
  return result.element;
};

describe('createDeleteElement', () => {
  it('accepts every element type returning it as the removal payload', () => {
    for (const element of allElements()) {
      const removed = expectOk({ element });

      expect(removed).toBe(element);
      expect(removed.type).toBe(element.type);
      expect(removed.id.equals(element.id)).toBe(true);
    }
  });

  it('preserves the full element so it can be restored on undo', () => {
    const removedTask = expectOk({ element: taskElement() });
    expect(removedTask.type).toBe('task');
    if (removedTask.type === 'task') {
      expect(removedTask.title).toBe('Ship it');
      expect(removedTask.status).toBe('todo');
    }

    const removedNote = expectOk({ element: noteElement({ color: '#ff0' }) });
    expect(removedNote.type).toBe('note');
    if (removedNote.type === 'note') {
      expect(removedNote.content).toBe('idea');
      expect(removedNote.color).toBe('#ff0');
    }
  });

  it('returns a validation error instead of throwing for an invalid element', () => {
    const element = {
      ...textElement(),
      createdAt: new Date('2024-05-01T00:00:00Z'),
    } as Element;
    const result = makeCommand()({ element });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
    }
  });

  it('does not mutate the input or the original element', () => {
    const element = textElement();
    const input: DeleteElementInput = { element };
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
      expect(firstResult.element.id.value).toBe('elem-1');
      expect(secondResult.element.id.value).toBe('elem-2');
    }
  });

  it('is apt for undo of a creation: removing by id restores the original store', () => {
    const element = textElement({ id: ElementId.create('elem-1') });
    const store: Element[] = [element];

    const afterDelete = store.filter((candidate) => !candidate.id.equals(element.id));
    const afterUndo = [...afterDelete, expectOk({ element })];

    expect(afterDelete).toHaveLength(0);
    expect(afterUndo.map((candidate) => candidate.id.value)).toEqual(['elem-1']);
  });

  it('is apt for redo: deleting the restored element matches the deleted state', () => {
    const element = textElement();
    const firstDelete = makeCommand()({ element });
    expect(firstDelete.status).toBe('ok');

    if (firstDelete.status === 'ok') {
      const restored = firstDelete.element;
      const secondDelete = makeCommand()({ element: restored });
      expect(secondDelete.status).toBe('ok');
      if (secondDelete.status === 'ok') {
        expect(secondDelete.element.id.equals(element.id)).toBe(true);
      }
    }
  });
});
