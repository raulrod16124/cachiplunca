import { createResizeElement, type ResizeElementInput } from '../../../../application/commands';
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

const makeCommand = (): ReturnType<typeof createResizeElement> =>
  createResizeElement({ now: () => UPDATED_AT });

const expectOk = (input: ResizeElementInput): Element => {
  const result = makeCommand()(input);
  if (result.status !== 'ok') {
    throw new Error(`Expected ok, got ${result.status}`);
  }
  return result.element;
};

describe('createResizeElement', () => {
  it('resizes every element type to the target size preserving its type', () => {
    const target = Size.create(320, 180.5);

    for (const element of allElements()) {
      const resized = expectOk({ element, size: target });

      expect(resized.type).toBe(element.type);
      expect(resized.id.equals(element.id)).toBe(true);
      expect(resized.size.equals(target)).toBe(true);
    }
  });

  it('preserves type-specific fields when resizing', () => {
    const resizedTask = expectOk({ element: taskElement(), size: Size.create(200, 100) });
    expect(resizedTask.type).toBe('task');
    if (resizedTask.type === 'task') {
      expect(resizedTask.title).toBe('Ship it');
      expect(resizedTask.status).toBe('todo');
    }

    const resizedNote = expectOk({
      element: noteElement({ color: '#ff0' }),
      size: Size.create(120, 120),
    });
    expect(resizedNote.type).toBe('note');
    if (resizedNote.type === 'note') {
      expect(resizedNote.content).toBe('idea');
      expect(resizedNote.color).toBe('#ff0');
    }
  });

  it('does not change the position when resizing', () => {
    const element = textElement({ position: Position.create(5, 6) });
    const resized = expectOk({ element, size: Size.create(300, 300) });

    expect(resized.position.equals(Position.create(5, 6))).toBe(true);
  });

  it('stamps updatedAt from the injected clock while preserving createdAt', () => {
    const resized = expectOk({ element: textElement(), size: Size.create(50, 50) });

    expect(resized.updatedAt).toBe(UPDATED_AT);
    expect(resized.createdAt).toBe(CREATED_AT);
  });

  it('falls back to a real clock when none is injected', () => {
    const command = createResizeElement();
    const result = command({ element: textElement(), size: Size.create(50, 50) });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.element.updatedAt.getTime()).toBeGreaterThanOrEqual(CREATED_AT.getTime());
    }
  });

  it('returns a validation error for an invalid size instead of throwing', () => {
    const invalidSize = { width: NaN, height: 10 } as Size;
    const result = makeCommand()({ element: textElement(), size: invalidSize });

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
    const result = createResizeElement({ now: () => new Date('2024-04-01T00:00:00Z') })({
      element,
      size: Size.create(50, 50),
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
    }
  });

  it('does not mutate the input or the original element', () => {
    const element = textElement({ size: Size.create(100, 40) });
    const input: ResizeElementInput = { element, size: Size.create(999, 999) };
    const elementSnapshot = { ...element };
    const inputSnapshot = { ...input };

    makeCommand()(input);

    expect(element).toEqual(elementSnapshot);
    expect(input).toEqual(inputSnapshot);
    expect(element.size.equals(Size.create(100, 40))).toBe(true);
  });

  it('is stateless: successive calls do not share resized elements', () => {
    const command = makeCommand();
    const element = textElement();

    const first = command({ element, size: Size.create(10, 10) });
    const second = command({ element, size: Size.create(20, 20) });

    expect(first.status).toBe('ok');
    expect(second.status).toBe('ok');
    if (first.status === 'ok' && second.status === 'ok') {
      expect(first.element).not.toBe(second.element);
      expect(first.element.size.equals(second.element.size)).toBe(false);
    }
  });

  it('is apt for undo: discarding the result restores the original state', () => {
    const original = textElement({ size: Size.create(100, 40) });
    const result = makeCommand()({ element: original, size: Size.create(300, 300) });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.element.size.equals(Size.create(300, 300))).toBe(true);
      expect(original.size.equals(Size.create(100, 40))).toBe(true);
    }
  });

  it('is apt for redo: resizing back to the original size restores it', () => {
    const command = makeCommand();
    const original = textElement({ size: Size.create(100, 40) });
    const resized = command({ element: original, size: Size.create(300, 300) });
    expect(resized.status).toBe('ok');

    if (resized.status === 'ok') {
      const restored = command({ element: resized.element, size: original.size });
      expect(restored.status).toBe('ok');
      if (restored.status === 'ok') {
        expect(restored.element.size.equals(original.size)).toBe(true);
      }
    }
  });
});
