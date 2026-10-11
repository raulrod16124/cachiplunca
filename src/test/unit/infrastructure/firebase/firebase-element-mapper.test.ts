import {
  createConnectorElement,
  createFrameElement,
  createLinkElement,
  createNoteElement,
  createTaskElement,
  createTextElement,
  type Element,
} from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import {
  fromElementDocument,
  toElementDocument,
  type ElementDocument,
} from '../../../../infrastructure/firebase/firebase-element-mapper';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');
const CREATED_AT = new Date('2024-01-01T00:00:00.000Z');
const UPDATED_AT = new Date('2024-02-01T00:00:00.000Z');

function buildBase(id: string) {
  return {
    id: ElementId.create(id),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(10, 20),
    size: Size.create(120, 80),
    rotation: 0,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  };
}

function expectBaseDocument(document: ElementDocument): void {
  expect(document.workspaceId).toBe('ws-1');
  expect(document.position).toEqual({ x: 10, y: 20 });
  expect(document.size).toEqual({ width: 120, height: 80 });
  expect(document.rotation).toBe(0);
  expect(document.createdBy).toBe('user-1');
  expect(document.createdAt).toEqual(CREATED_AT);
  expect(document.updatedAt).toEqual(UPDATED_AT);
}

function asRecord(document: ElementDocument): Record<string, unknown> {
  return document as unknown as Record<string, unknown>;
}

function expectRoundTrip(element: Element): void {
  const document = toElementDocument(element);
  const restored = fromElementDocument(element.id.value, document);

  expect(restored).toEqual(element);
  expect(restored.type).toBe(element.type);
  expect(restored.position.equals(element.position)).toBe(true);
  expect(restored.size.equals(element.size)).toBe(true);
}

describe('toElementDocument', () => {
  it('maps a TextElement to a plain document', () => {
    const element = createTextElement({ ...buildBase('el-text'), content: 'Hello' });

    const document = toElementDocument(element);

    expect(document.type).toBe('text');
    expectBaseDocument(document);
    expect(asRecord(document).content).toBe('Hello');
  });

  it('maps a NoteElement preserving optional color', () => {
    const element = createNoteElement({
      ...buildBase('el-note'),
      content: 'A note',
      color: '#ffcc00',
    });

    const document = toElementDocument(element);

    expect(document.type).toBe('note');
    expect(asRecord(document).content).toBe('A note');
    expect(asRecord(document).color).toBe('#ffcc00');
  });

  it('omits color from a NoteElement document when absent', () => {
    const element = createNoteElement({ ...buildBase('el-note'), content: 'Plain' });

    const document = toElementDocument(element);

    expect(document.type).toBe('note');
    expect('color' in document).toBe(false);
  });

  it('maps a TaskElement with optional assignee and dueDate', () => {
    const element = createTaskElement({
      ...buildBase('el-task'),
      title: 'Do it',
      status: 'in_progress',
      assigneeId: UserId.create('user-2'),
      dueDate: new Date('2024-12-31T00:00:00.000Z'),
    });

    const document = toElementDocument(element);

    expect(document.type).toBe('task');
    expect(asRecord(document).title).toBe('Do it');
    expect(asRecord(document).status).toBe('in_progress');
    expect(asRecord(document).assigneeId).toBe('user-2');
    expect(asRecord(document).dueDate).toEqual(new Date('2024-12-31T00:00:00.000Z'));
  });

  it('omits optional fields from a TaskElement document when absent', () => {
    const element = createTaskElement({
      ...buildBase('el-task'),
      title: 'Simple',
      status: 'todo',
    });

    const document = toElementDocument(element);

    expect('assigneeId' in document).toBe(false);
    expect('dueDate' in document).toBe(false);
  });

  it('maps a FrameElement with optional parentFrameId', () => {
    const element = createFrameElement({
      ...buildBase('el-frame'),
      title: 'Section',
      parentFrameId: ElementId.create('el-parent'),
    });

    const document = toElementDocument(element);

    expect(document.type).toBe('frame');
    expect(asRecord(document).title).toBe('Section');
    expect(asRecord(document).parentFrameId).toBe('el-parent');
  });

  it('omits parentFrameId from a FrameElement document when absent', () => {
    const element = createFrameElement({ ...buildBase('el-frame'), title: 'Root' });

    const document = toElementDocument(element);

    expect('parentFrameId' in document).toBe(false);
  });

  it('maps a ConnectorElement', () => {
    const element = createConnectorElement({
      ...buildBase('el-connector'),
      sourceElementId: ElementId.create('el-a'),
      targetElementId: ElementId.create('el-b'),
    });

    const document = toElementDocument(element);

    expect(document.type).toBe('connector');
    expect(asRecord(document).sourceElementId).toBe('el-a');
    expect(asRecord(document).targetElementId).toBe('el-b');
  });

  it('maps a LinkElement with optional title', () => {
    const element = createLinkElement({
      ...buildBase('el-link'),
      url: 'https://example.com',
      title: 'Example',
    });

    const document = toElementDocument(element);

    expect(document.type).toBe('link');
    expect(asRecord(document).url).toBe('https://example.com');
    expect(asRecord(document).title).toBe('Example');
  });

  it('omits title from a LinkElement document when absent', () => {
    const element = createLinkElement({
      ...buildBase('el-link'),
      url: 'https://example.com',
    });

    const document = toElementDocument(element);

    expect('title' in document).toBe(false);
  });
});

describe('fromElementDocument', () => {
  it('round-trips every MVP element type', () => {
    expectRoundTrip(createTextElement({ ...buildBase('el-text'), content: 'Hello' }));
    expectRoundTrip(createNoteElement({ ...buildBase('el-note'), content: 'Note' }));
    expectRoundTrip(createTaskElement({ ...buildBase('el-task'), title: 'Task', status: 'done' }));
    expectRoundTrip(createFrameElement({ ...buildBase('el-frame'), title: 'Frame' }));
    expectRoundTrip(
      createConnectorElement({
        ...buildBase('el-connector'),
        sourceElementId: ElementId.create('el-a'),
        targetElementId: ElementId.create('el-b'),
      }),
    );
    expectRoundTrip(createLinkElement({ ...buildBase('el-link'), url: 'https://example.com' }));
  });

  it('accepts Timestamp-like date fields', () => {
    const document = {
      ...toElementDocument(createTextElement({ ...buildBase('el-text'), content: 'Hello' })),
      createdAt: { toDate: () => CREATED_AT },
      updatedAt: { toDate: () => UPDATED_AT },
    };

    const element = fromElementDocument('el-text', document);

    expect(element.createdAt.getTime()).toBe(CREATED_AT.getTime());
    expect(element.updatedAt.getTime()).toBe(UPDATED_AT.getTime());
  });

  it('rejects a non-object document', () => {
    expect(() => fromElementDocument('el-1', null)).toThrow('Element document must be an object');
  });

  it('rejects an invalid type', () => {
    const document = {
      ...toElementDocument(createTextElement({ ...buildBase('el-text'), content: 'Hello' })),
      type: 'unknown',
    };

    expect(() => fromElementDocument('el-text', document)).toThrow(
      'Element document field "type" must be one of',
    );
  });

  it('rejects a missing base field', () => {
    const document = toElementDocument(
      createTextElement({ ...buildBase('el-text'), content: 'Hello' }),
    );
    const { workspaceId: _workspaceId, ...withoutWorkspace } = document;

    expect(() => fromElementDocument('el-text', withoutWorkspace)).toThrow(
      'Element document field "workspaceId" must be a string',
    );
  });

  it('rejects a negative size dimension', () => {
    const document = {
      ...toElementDocument(createTextElement({ ...buildBase('el-text'), content: 'Hello' })),
      size: { width: -10, height: 80 },
    };

    expect(() => fromElementDocument('el-text', document)).toThrow(
      'Element document field "size.width" cannot be negative',
    );
  });

  it('rejects a missing type-specific field', () => {
    const document = {
      ...toElementDocument(createTextElement({ ...buildBase('el-text'), content: 'Hello' })),
      content: undefined,
    };

    expect(() => fromElementDocument('el-text', document)).toThrow(
      'Element document field "content" must be a string',
    );
  });

  it('rejects an invalid task status', () => {
    const document = {
      ...toElementDocument(
        createTaskElement({ ...buildBase('el-task'), title: 'Task', status: 'todo' }),
      ),
      status: 'blocked',
    };

    expect(() => fromElementDocument('el-task', document)).toThrow(
      'Element document field "status" must be a valid task status',
    );
  });
});
