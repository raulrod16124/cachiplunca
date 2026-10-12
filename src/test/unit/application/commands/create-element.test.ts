import { createCreateElement, type CreateElementInput } from '../../../../application/commands';
import type { Element } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { ERROR_CODES } from '../../../../shared/errors';

const FIXED_NOW = new Date('2024-01-01T00:00:00Z');

const base = (overrides: Partial<CreateElementInput> = {}): CreateElementInput =>
  ({
    type: 'text',
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(10, 20),
    size: Size.create(100, 40),
    content: 'hello',
    ...overrides,
  }) as CreateElementInput;

const makeCommand = (): ReturnType<typeof createCreateElement> =>
  createCreateElement({
    generateId: () => ElementId.create('elem-1'),
    now: () => FIXED_NOW,
  });

const expectOk = (input: CreateElementInput): Element => {
  const result = makeCommand()(input);
  if (result.status !== 'ok') {
    throw new Error(`Expected ok, got ${result.status}`);
  }
  return result.element;
};

describe('createCreateElement', () => {
  it('creates a text element', () => {
    const element = expectOk(base({ type: 'text', content: 'Title' }));

    expect(element.type).toBe('text');
    if (element.type === 'text') {
      expect(element.content).toBe('Title');
    }
  });

  it('creates a note element with an optional color', () => {
    const element = expectOk(base({ type: 'note', content: 'Idea', color: '#fff' }));

    expect(element.type).toBe('note');
    if (element.type === 'note') {
      expect(element.content).toBe('Idea');
      expect(element.color).toBe('#fff');
    }
  });

  it('creates a task element with status and optional fields', () => {
    const assigneeId = UserId.create('user-2');
    const dueDate = new Date('2024-02-01T00:00:00Z');
    const element = expectOk(
      base({ type: 'task', title: 'Ship it', status: 'todo', assigneeId, dueDate }),
    );

    expect(element.type).toBe('task');
    if (element.type === 'task') {
      expect(element.title).toBe('Ship it');
      expect(element.status).toBe('todo');
      expect(element.assigneeId?.value).toBe('user-2');
      expect(element.dueDate).toBe(dueDate);
    }
  });

  it('creates a frame element', () => {
    const element = expectOk(base({ type: 'frame', title: 'Phase 1' }));

    expect(element.type).toBe('frame');
    if (element.type === 'frame') {
      expect(element.title).toBe('Phase 1');
    }
  });

  it('creates a connector element', () => {
    const element = expectOk(
      base({
        type: 'connector',
        sourceElementId: ElementId.create('a'),
        targetElementId: ElementId.create('b'),
      }),
    );

    expect(element.type).toBe('connector');
    if (element.type === 'connector') {
      expect(element.sourceElementId.value).toBe('a');
      expect(element.targetElementId.value).toBe('b');
    }
  });

  it('creates a link element', () => {
    const element = expectOk(base({ type: 'link', url: 'https://example.com', title: 'Docs' }));

    expect(element.type).toBe('link');
    if (element.type === 'link') {
      expect(element.url).toBe('https://example.com');
      expect(element.title).toBe('Docs');
    }
  });

  it('generates the id and metadata through the injected dependencies', () => {
    const workspaceId = WorkspaceId.create('ws-9');
    const element = expectOk(
      base({ workspaceId, position: Position.create(3, 4), size: Size.create(50, 60) }),
    );

    expect(element.id.value).toBe('elem-1');
    expect(element.workspaceId.value).toBe('ws-9');
    expect(element.createdBy.value).toBe('user-1');
    expect(element.position.x).toBe(3);
    expect(element.position.y).toBe(4);
    expect(element.size.width).toBe(50);
    expect(element.size.height).toBe(60);
    expect(element.rotation).toBe(0);
    expect(element.createdAt).toBe(FIXED_NOW);
    expect(element.updatedAt.getTime()).toBeGreaterThanOrEqual(element.createdAt.getTime());
  });

  it('honors an explicit rotation', () => {
    const element = expectOk(base({ rotation: 45 }));

    expect(element.rotation).toBe(45);
  });

  it('falls back to real timestamps when no clock is injected', () => {
    const command = createCreateElement({ generateId: () => ElementId.create('elem-1') });

    const result = command(base());

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.element.createdAt).toBeInstanceOf(Date);
      expect(result.element.updatedAt.getTime()).toBeGreaterThanOrEqual(
        result.element.createdAt.getTime(),
      );
    }
  });

  it('returns a validation error instead of throwing for an empty task title', () => {
    const input = Object.assign(base({ type: 'task', title: 'x', status: 'todo' }), {
      title: '',
    });

    const result = makeCommand()(input);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_INVALID_INPUT);
    }
  });

  it('returns a validation error for an unknown task status', () => {
    const input = Object.assign(base({ type: 'task', title: 'x', status: 'todo' }), {
      status: 'archived',
    });

    const result = makeCommand()(input);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
    }
  });

  it('rejects a connector whose endpoints are the same', () => {
    const result = makeCommand()(
      base({
        type: 'connector',
        sourceElementId: ElementId.create('same'),
        targetElementId: ElementId.create('same'),
      }),
    );

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
    }
  });

  it('rejects an empty link url', () => {
    const result = makeCommand()(base({ type: 'link', url: '   ' }));

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
    }
  });

  it('rejects a frame that is its own parent', () => {
    const command = createCreateElement({ generateId: () => ElementId.create('frame-1') });

    const result = command(
      base({ type: 'frame', title: 'Nested', parentFrameId: ElementId.create('frame-1') }),
    );

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('validation');
    }
  });

  it('does not mutate its input', () => {
    const input = base({ type: 'text', content: 'original' });
    const snapshot = { ...input };

    makeCommand()(input);

    expect(input).toEqual(snapshot);
  });

  it('is stateless: successive calls do not share created elements', () => {
    const ids = ['elem-1', 'elem-2'];
    let index = 0;
    const command = createCreateElement({
      generateId: () => ElementId.create(ids[index++] ?? 'overflow'),
    });

    const first = command(base({ type: 'text', content: 'first' }));
    const second = command(base({ type: 'text', content: 'second' }));

    expect(first.status).toBe('ok');
    expect(second.status).toBe('ok');
    if (first.status === 'ok' && second.status === 'ok') {
      expect(first.element).not.toBe(second.element);
      expect(first.element.id.value).toBe('elem-1');
      expect(second.element.id.value).toBe('elem-2');
    }
  });

  it('is invertible by id, so a future history can undo a creation', () => {
    const workspaceId = WorkspaceId.create('ws-1');
    const store: Element[] = [];
    const element = expectOk(base({ workspaceId }));

    const afterCreate = [...store, element];
    const afterUndo = afterCreate.filter((candidate) => !candidate.id.equals(element.id));

    expect(afterCreate).toHaveLength(1);
    expect(afterUndo).toEqual(store);
  });
});
