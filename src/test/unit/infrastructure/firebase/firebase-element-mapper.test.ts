import {
  createConnectorElement,
  createFrameElement,
  createImageElement,
  createLinkElement,
  createNoteElement,
  createTaskElement,
  createTextElement,
  isImageElement,
  richTextFromPlain,
  type Element,
} from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import {
  fromElementDocument,
  toElementDocument,
  type ElementDocument,
  type ImageElementDocument,
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
  expect(document.zIndex).toBe(0);
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
    expect(asRecord(document).content).toEqual(richTextFromPlain('Hello'));
  });

  it('maps a NoteElement preserving optional color', () => {
    const element = createNoteElement({
      ...buildBase('el-note'),
      content: 'A note',
      color: '#ffcc00',
    });

    const document = toElementDocument(element);

    expect(document.type).toBe('note');
    expect(asRecord(document).content).toEqual(richTextFromPlain('A note'));
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
    expect(asRecord(document).title).toEqual(richTextFromPlain('Do it'));
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
    expect(asRecord(document).title).toEqual(richTextFromPlain('Section'));
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
    expect(asRecord(document).title).toEqual(richTextFromPlain('Example'));
  });

  it('omits title from a LinkElement document when absent', () => {
    const element = createLinkElement({
      ...buildBase('el-link'),
      url: 'https://example.com',
    });

    const document = toElementDocument(element);

    expect('title' in document).toBe(false);
  });

  it('maps an ImageElement with optional alt', () => {
    const element = createImageElement({
      ...buildBase('el-image'),
      src: 'https://example.com/image.png',
      alt: 'Diagram',
    });

    const document = toElementDocument(element);

    expect(document.type).toBe('image');
    expect(asRecord(document).src).toBe('https://example.com/image.png');
    expect(asRecord(document).alt).toBe('Diagram');

    const withoutAlt = toElementDocument(
      createImageElement({ ...buildBase('el-image'), src: 'https://example.com/image.png' }),
    );
    expect('alt' in withoutAlt).toBe(false);
  });

  it('maps an ImageElement storage path when present', () => {
    const storagePath = 'workspaces/ws-1/images/image-1-diagram.png';
    const element = createImageElement({
      ...buildBase('el-image'),
      src: 'https://example.com/image.png',
      storagePath,
    });

    const document = toElementDocument(element);

    expect(asRecord(document).storagePath).toBe(storagePath);
    expectRoundTrip(element);

    const withoutStoragePath = toElementDocument(
      createImageElement({ ...buildBase('el-image'), src: 'https://example.com/image.png' }),
    );
    expect('storagePath' in withoutStoragePath).toBe(false);
  });

  it('loads legacy ImageElement documents without a storage path', () => {
    const element = createImageElement({
      ...buildBase('el-image'),
      src: 'https://example.com/image.png',
    });
    const document = toElementDocument(element) as ImageElementDocument;
    const { storagePath: _storagePath, ...legacyDocument } = document;

    const fromLegacy = fromElementDocument('el-image', legacyDocument);

    expect(isImageElement(fromLegacy)).toBe(true);
    if (isImageElement(fromLegacy)) {
      expect(fromLegacy.storagePath).toBeUndefined();
    }
  });
});

describe('fromElementDocument', () => {
  it('round-trips every element type', () => {
    expectRoundTrip(createTextElement({ ...buildBase('el-text'), content: 'Hello' }));
    expectRoundTrip(createNoteElement({ ...buildBase('el-note'), content: 'Note' }));
    expectRoundTrip(
      createTaskElement({ ...buildBase('el-task'), title: 'Task', status: 'completed' }),
    );
    expectRoundTrip(createFrameElement({ ...buildBase('el-frame'), title: 'Frame' }));
    expectRoundTrip(
      createConnectorElement({
        ...buildBase('el-connector'),
        sourceElementId: ElementId.create('el-a'),
        targetElementId: ElementId.create('el-b'),
      }),
    );
    expectRoundTrip(createLinkElement({ ...buildBase('el-link'), url: 'https://example.com' }));
    expectRoundTrip(
      createImageElement({
        ...buildBase('el-image'),
        src: 'https://example.com/image.png',
        alt: 'Diagram',
      }),
    );
  });

  it('maps a non-zero zIndex', () => {
    const element = createTextElement({
      ...buildBase('el-text'),
      content: 'Hello',
      zIndex: 7,
    });

    const document = toElementDocument(element);

    expect(document.zIndex).toBe(7);
    expectRoundTrip(element);
  });

  it('defaults a missing zIndex to zero for legacy documents', () => {
    const document = toElementDocument(
      createTextElement({ ...buildBase('el-text'), content: 'Hello' }),
    );
    const { zIndex: _zIndex, ...withoutZIndex } = document;

    const element = fromElementDocument('el-text', withoutZIndex);

    expect(element.zIndex).toBe(0);
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

  it('converts legacy string content and titles when reading', () => {
    const base = {
      ...toElementDocument(createTextElement({ ...buildBase('el-text'), content: 'Hello' })),
    };
    const text = fromElementDocument('el-text', { ...base, content: 'Legacy text' });
    expect(text.type).toBe('text');
    expect(text.type === 'text' ? text.content : null).toEqual(richTextFromPlain('Legacy text'));

    const noteDocument = toElementDocument(
      createNoteElement({ ...buildBase('el-note'), content: 'x' }),
    );
    const note = fromElementDocument('el-note', { ...noteDocument, content: 'Legacy note' });
    expect(note.type === 'note' ? note.content : null).toEqual(richTextFromPlain('Legacy note'));

    const taskDocument = toElementDocument(
      createTaskElement({ ...buildBase('el-task'), title: 'x', status: 'todo' }),
    );
    const task = fromElementDocument('el-task', { ...taskDocument, title: 'Legacy task' });
    expect(task.type === 'task' ? task.title : null).toEqual(richTextFromPlain('Legacy task'));

    const frameDocument = toElementDocument(
      createFrameElement({ ...buildBase('el-frame'), title: 'x' }),
    );
    const frame = fromElementDocument('el-frame', { ...frameDocument, title: 'Legacy frame' });
    expect(frame.type === 'frame' ? frame.title : null).toEqual(richTextFromPlain('Legacy frame'));

    const linkDocument = toElementDocument(
      createLinkElement({ ...buildBase('el-link'), url: 'https://example.com' }),
    );
    const link = fromElementDocument('el-link', { ...linkDocument, title: 'Legacy link' });
    expect(link.type === 'link' ? link.title : null).toEqual(richTextFromPlain('Legacy link'));
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
      'Rich text content must be a rich text document',
    );
  });

  it('rejects an invalid task status', () => {
    const document = {
      ...toElementDocument(
        createTaskElement({ ...buildBase('el-task'), title: 'Task', status: 'todo' }),
      ),
      status: 'archived',
    };

    expect(() => fromElementDocument('el-task', document)).toThrow(
      'Element document field "status" must be a valid task status',
    );
  });
});

describe('free connector mapping', () => {
  it('maps free endpoints and omits element ids', () => {
    const element = createConnectorElement({
      ...buildBase('el-free'),
      sourcePoint: Position.create(0, 20),
      targetPoint: Position.create(160, 20),
    });

    const document = toElementDocument(element);
    const record = asRecord(document);

    expect(record.sourceElementId).toBeUndefined();
    expect(record.targetElementId).toBeUndefined();
    expect(record.sourcePoint).toEqual({ x: 0, y: 20 });
    expect(record.targetPoint).toEqual({ x: 160, y: 20 });
  });

  it('round-trips a free connector', () => {
    expectRoundTrip(
      createConnectorElement({
        ...buildBase('el-free'),
        sourcePoint: Position.create(0, 20),
        targetPoint: Position.create(160, 20),
      }),
    );
  });

  it('still reads legacy documents with both element ids', () => {
    const document = toElementDocument(
      createConnectorElement({
        ...buildBase('el-legacy'),
        sourceElementId: ElementId.create('el-a'),
        targetElementId: ElementId.create('el-b'),
      }),
    );

    const element = fromElementDocument('el-legacy', document);

    expect(element.type).toBe('connector');
    if (element.type !== 'connector') {
      return;
    }

    expect(element.sourceElementId?.value).toBe('el-a');
    expect(element.targetElementId?.value).toBe('el-b');
  });

  it('rejects a document with a missing free point', () => {
    const document = toElementDocument(
      createConnectorElement({
        ...buildBase('el-free'),
        sourcePoint: Position.create(0, 20),
        targetPoint: Position.create(160, 20),
      }),
    );
    const record = asRecord(document);
    const { sourcePoint: _sourcePoint, ...withoutSourcePoint } = record;

    expect(() => fromElementDocument('el-free', withoutSourcePoint)).toThrow(/position/);
  });
});
