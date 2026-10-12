import { createMoveElement, type MoveElementInput } from '../../../../application/commands';
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
const UPDATED_AT = new Date('2024-02-01T00:00:00Z');

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

const makeCommand = (): ReturnType<typeof createMoveElement> =>
  createMoveElement({ now: () => UPDATED_AT });

const expectOk = (input: MoveElementInput): Element => {
  const result = makeCommand()(input);
  if (result.status !== 'ok') {
    throw new Error(`Expected ok, got ${result.status}`);
  }
  return result.element;
};

describe('createMoveElement', () => {
  it('moves every element type to the target position preserving its type', () => {
    const target = Position.create(-30, 45.5);

    for (const element of allElements()) {
      const moved = expectOk({ element, position: target });

      expect(moved.type).toBe(element.type);
      expect(moved.id.equals(element.id)).toBe(true);
      expect(moved.position.equals(target)).toBe(true);
    }
  });

  it('preserves type-specific fields when moving', () => {
    const movedTask = expectOk({ element: taskElement(), position: Position.create(1, 2) });
    expect(movedTask.type).toBe('task');
    if (movedTask.type === 'task') {
      expect(movedTask.title).toBe('Ship it');
      expect(movedTask.status).toBe('todo');
    }

    const movedNote = expectOk({
      element: noteElement({ color: '#ff0' }),
      position: Position.create(3, 4),
    });
    expect(movedNote.type).toBe('note');
    if (movedNote.type === 'note') {
      expect(movedNote.content).toBe('idea');
      expect(movedNote.color).toBe('#ff0');
    }
  });

  it('stamps updatedAt from the injected clock while preserving createdAt', () => {
    const moved = expectOk({ element: textElement(), position: Position.create(7, 8) });

    expect(moved.updatedAt).toBe(UPDATED_AT);
    expect(moved.createdAt).toBe(CREATED_AT);
  });

  it('falls back to a real clock when none is injected', () => {
    const command = createMoveElement();
    const result = command({ element: textElement(), position: Position.create(1, 1) });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.element.updatedAt.getTime()).toBeGreaterThanOrEqual(CREATED_AT.getTime());
    }
  });

  it('returns a validation error for an invalid position instead of throwing', () => {
    const invalidPosition = { x: NaN, y: 0 } as Position;
    const result = makeCommand()({ element: textElement(), position: invalidPosition });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
    }
  });

  it('surfaces domain validation failures as app errors instead of throwing', () => {
    const element = textElement({
      createdAt: new Date('2024-05-01T00:00:00Z'),
      updatedAt: new Date('2024-05-01T00:00:00Z'),
    });
    const result = createMoveElement({ now: () => new Date('2024-04-01T00:00:00Z') })({
      element,
      position: Position.create(1, 1),
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
    }
  });

  it('does not mutate the input or the original element', () => {
    const element = textElement({ position: Position.create(10, 20) });
    const input: MoveElementInput = { element, position: Position.create(99, 99) };
    const elementSnapshot = { ...element };
    const inputSnapshot = { ...input };

    makeCommand()(input);

    expect(element).toEqual(elementSnapshot);
    expect(input).toEqual(inputSnapshot);
    expect(element.position.equals(Position.create(10, 20))).toBe(true);
  });

  it('is stateless: successive calls do not share moved elements', () => {
    const command = makeCommand();
    const element = textElement();

    const first = command({ element, position: Position.create(1, 1) });
    const second = command({ element, position: Position.create(2, 2) });

    expect(first.status).toBe('ok');
    expect(second.status).toBe('ok');
    if (first.status === 'ok' && second.status === 'ok') {
      expect(first.element).not.toBe(second.element);
      expect(first.element.position.equals(second.element.position)).toBe(false);
    }
  });

  it('is apt for undo: discarding the result restores the original state', () => {
    const original = textElement({ position: Position.create(10, 20) });
    const result = makeCommand()({ element: original, position: Position.create(30, 40) });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.element.position.equals(Position.create(30, 40))).toBe(true);
      expect(original.position.equals(Position.create(10, 20))).toBe(true);
    }
  });

  it('is apt for redo: moving back to the original position restores it', () => {
    const command = makeCommand();
    const original = textElement({ position: Position.create(10, 20) });
    const moved = command({ element: original, position: Position.create(30, 40) });
    expect(moved.status).toBe('ok');

    if (moved.status === 'ok') {
      const restored = command({ element: moved.element, position: original.position });
      expect(restored.status).toBe('ok');
      if (restored.status === 'ok') {
        expect(restored.element.position.equals(original.position)).toBe(true);
      }
    }
  });
});
