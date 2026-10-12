import { createUpdateElement, type UpdateElementInput } from '../../../../application/commands';
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

const makeCommand = (): ReturnType<typeof createUpdateElement> =>
  createUpdateElement({ now: () => UPDATED_AT });

const expectOk = (input: UpdateElementInput): Element => {
  const result = makeCommand()(input);
  if (result.status !== 'ok') {
    throw new Error(`Expected ok, got ${result.status}`);
  }
  return result.element;
};

describe('createUpdateElement', () => {
  it('updates text content', () => {
    const element = expectOk({ element: textElement(), type: 'text', content: 'updated' });

    expect(element.type).toBe('text');
    if (element.type === 'text') {
      expect(element.content).toBe('updated');
    }
  });

  it('updates note content and color', () => {
    const element = expectOk({
      element: noteElement(),
      type: 'note',
      content: 'revised',
      color: '#ff0',
    });

    expect(element.type).toBe('note');
    if (element.type === 'note') {
      expect(element.content).toBe('revised');
      expect(element.color).toBe('#ff0');
    }
  });

  it('updates task title, status, assignee and due date', () => {
    const assigneeId = UserId.create('user-2');
    const dueDate = new Date('2024-03-01T00:00:00Z');
    const element = expectOk({
      element: taskElement(),
      type: 'task',
      title: 'Ship it now',
      status: 'in_progress',
      assigneeId,
      dueDate,
    });

    expect(element.type).toBe('task');
    if (element.type === 'task') {
      expect(element.title).toBe('Ship it now');
      expect(element.status).toBe('in_progress');
      expect(element.assigneeId?.value).toBe('user-2');
      expect(element.dueDate).toBe(dueDate);
    }
  });

  it('clears task assignee and due date when null is provided', () => {
    const element = expectOk({
      element: taskElement({ assigneeId: UserId.create('user-2'), dueDate: UPDATED_AT }),
      type: 'task',
      assigneeId: null,
      dueDate: null,
    });

    expect(element.type).toBe('task');
    if (element.type === 'task') {
      expect(element.assigneeId).toBeUndefined();
      expect(element.dueDate).toBeUndefined();
    }
  });

  it('updates frame title and parent, and clears the parent with null', () => {
    const titled = expectOk({
      element: frameElement(),
      type: 'frame',
      title: 'Phase 2',
      parentFrameId: ElementId.create('parent-1'),
    });

    expect(titled.type).toBe('frame');
    if (titled.type === 'frame') {
      expect(titled.title).toBe('Phase 2');
      expect(titled.parentFrameId?.value).toBe('parent-1');
    }

    const cleared = expectOk({ element: titled, type: 'frame', parentFrameId: null });
    if (cleared.type === 'frame') {
      expect(cleared.parentFrameId).toBeUndefined();
    }
  });

  it('updates connector endpoints', () => {
    const element = expectOk({
      element: connectorElement(),
      type: 'connector',
      sourceElementId: ElementId.create('c'),
    });

    expect(element.type).toBe('connector');
    if (element.type === 'connector') {
      expect(element.sourceElementId.value).toBe('c');
      expect(element.targetElementId.value).toBe('b');
    }
  });

  it('updates link url and clears its title with null', () => {
    const element = expectOk({
      element: linkElement({ title: 'Docs' }),
      type: 'link',
      url: 'https://example.org',
      title: null,
    });

    expect(element.type).toBe('link');
    if (element.type === 'link') {
      expect(element.url).toBe('https://example.org');
      expect(element.title).toBeUndefined();
    }
  });

  it('updates rotation for any element type', () => {
    const element = expectOk({ element: textElement(), type: 'text', rotation: 45 });

    expect(element.rotation).toBe(45);
  });

  it('stamps updatedAt from the injected clock while preserving createdAt', () => {
    const element = expectOk({ element: textElement(), type: 'text', content: 'updated' });

    expect(element.updatedAt).toBe(UPDATED_AT);
    expect(element.createdAt).toBe(CREATED_AT);
  });

  it('falls back to a real clock when none is injected', () => {
    const command = createUpdateElement();
    const result = command({ element: textElement(), type: 'text', content: 'x' });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.element.updatedAt.getTime()).toBeGreaterThanOrEqual(CREATED_AT.getTime());
    }
  });

  it('returns a validation error when no field is provided', () => {
    const result = makeCommand()({ element: textElement(), type: 'text' });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
    }
  });

  it('returns a validation error when the patch type does not match the element', () => {
    const input = { element: textElement(), type: 'note', content: 'x' } as UpdateElementInput;
    const result = makeCommand()(input);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
    }
  });

  it('surfaces domain validation failures as app errors instead of throwing', () => {
    const cases: UpdateElementInput[] = [
      { element: taskElement(), type: 'task', title: '   ' },
      { element: taskElement(), type: 'task', status: 'archived' as never },
      { element: linkElement(), type: 'link', url: '   ' },
      {
        element: connectorElement(),
        type: 'connector',
        sourceElementId: ElementId.create('same'),
        targetElementId: ElementId.create('same'),
      },
      {
        element: frameElement({ id: ElementId.create('self') }),
        type: 'frame',
        parentFrameId: ElementId.create('self'),
      },
    ];

    for (const input of cases) {
      const result = makeCommand()(input);
      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.kind).toBe('validation');
        expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
      }
    }
  });

  it('does not mutate the input or the original element', () => {
    const element = textElement({ content: 'original' });
    const input: UpdateElementInput = { element, type: 'text', content: 'changed' };
    const elementSnapshot = { ...element };
    const inputSnapshot = { ...input };

    makeCommand()(input);

    expect(element).toEqual(elementSnapshot);
    expect(input).toEqual(inputSnapshot);
    expect(element.content).toBe('original');
  });

  it('is stateless: successive calls do not share updated elements', () => {
    const command = makeCommand();
    const element = textElement();

    const first = command({ element, type: 'text', content: 'first' });
    const second = command({ element, type: 'text', content: 'second' });

    expect(first.status).toBe('ok');
    expect(second.status).toBe('ok');
    if (first.status === 'ok' && second.status === 'ok') {
      expect(first.element).not.toBe(second.element);
    }
  });

  it('is apt for undo: discarding the result restores the original state', () => {
    const original = textElement({ content: 'before' });
    const result = makeCommand()({ element: original, type: 'text', content: 'after' });

    expect(result.status).toBe('ok');
    if (result.status === 'ok' && result.element.type === 'text') {
      expect(result.element.content).toBe('after');
      expect(original.content).toBe('before');
    }
  });
});
