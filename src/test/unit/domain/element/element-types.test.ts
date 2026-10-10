import {
  ELEMENT_TYPES,
  TASK_STATUSES,
  isConnectorElement,
  isFrameElement,
  isLinkElement,
  isNoteElement,
  isTaskElement,
  isTextElement,
  validateConnectorElement,
  validateElement,
  validateFrameElement,
  validateLinkElement,
  validateNoteElement,
  validateTaskElement,
  validateTextElement,
  withRotation,
} from '../../../../domain/element';
import type {
  BaseElement,
  ConnectorElement,
  Element,
  FrameElement,
  LinkElement,
  NoteElement,
  TaskElement,
  TextElement,
} from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';

const createBaseElement = (overrides: Partial<BaseElement> = {}): BaseElement => ({
  id: ElementId.create('elem-1'),
  workspaceId: WorkspaceId.create('ws-1'),
  type: 'text',
  position: Position.create(0, 0),
  size: Size.create(10, 10),
  rotation: 0,
  createdBy: UserId.create('user-1'),
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
  ...overrides,
});

const createTextElement = (overrides: Partial<TextElement> = {}): TextElement => ({
  ...createBaseElement(),
  type: 'text',
  content: 'hello',
  ...overrides,
});

const createNoteElement = (overrides: Partial<NoteElement> = {}): NoteElement => ({
  ...createBaseElement(),
  type: 'note',
  content: 'note content',
  ...overrides,
});

const createTaskElement = (overrides: Partial<TaskElement> = {}): TaskElement => ({
  ...createBaseElement(),
  type: 'task',
  title: 'task title',
  status: 'todo',
  ...overrides,
});

const createFrameElement = (overrides: Partial<FrameElement> = {}): FrameElement => ({
  ...createBaseElement(),
  type: 'frame',
  title: 'frame title',
  ...overrides,
});

const createConnectorElement = (overrides: Partial<ConnectorElement> = {}): ConnectorElement => ({
  ...createBaseElement(),
  type: 'connector',
  sourceElementId: ElementId.create('source'),
  targetElementId: ElementId.create('target'),
  ...overrides,
});

const createLinkElement = (overrides: Partial<LinkElement> = {}): LinkElement => ({
  ...createBaseElement(),
  type: 'link',
  url: 'https://example.com',
  ...overrides,
});

const allElements = (): Element[] => [
  createTextElement(),
  createNoteElement(),
  createTaskElement(),
  createFrameElement(),
  createConnectorElement(),
  createLinkElement(),
];

describe('Element types', () => {
  it('declares the six MVP element types and task statuses', () => {
    expect(ELEMENT_TYPES).toEqual(['text', 'note', 'task', 'frame', 'connector', 'link']);
    expect(TASK_STATUSES).toEqual(['todo', 'in_progress', 'done']);
  });

  it('distinguishes types with type narrowing', () => {
    const types = allElements().map((element) => {
      if (isTextElement(element)) return 'text';
      if (isNoteElement(element)) return 'note';
      if (isTaskElement(element)) return 'task';
      if (isFrameElement(element)) return 'frame';
      if (isConnectorElement(element)) return 'connector';
      if (isLinkElement(element)) return 'link';
      return 'unknown';
    });

    expect(types).toEqual(['text', 'note', 'task', 'frame', 'connector', 'link']);
  });

  it('narrows on the discriminant to access type-specific fields', () => {
    const elements: Element[] = [
      createTextElement(),
      createTaskElement(),
      createLinkElement(),
      createNoteElement(),
      createFrameElement(),
      createConnectorElement(),
    ];

    const summaries = elements.map((element) => {
      switch (element.type) {
        case 'text':
          return element.content;
        case 'task':
          return `${element.title}:${element.status}`;
        case 'link':
          return element.url;
        case 'frame':
          return element.title;
        case 'note':
          return element.content;
        case 'connector':
          return `${element.sourceElementId.value}->${element.targetElementId.value}`;
      }
    });

    expect(summaries).toEqual([
      'hello',
      'task title:todo',
      'https://example.com',
      'note content',
      'frame title',
      'source->target',
    ]);
  });

  it('keeps position, size and rotation on every element type', () => {
    const position = Position.create(5, 7);
    const size = Size.create(100, 40);

    const elements: Element[] = [
      createTextElement({ position, size, rotation: 15 }),
      createNoteElement({ position, size, rotation: 15 }),
      createTaskElement({ position, size, rotation: 15 }),
      createFrameElement({ position, size, rotation: 15 }),
      createConnectorElement({ position, size, rotation: 15 }),
      createLinkElement({ position, size, rotation: 15 }),
    ];

    for (const element of elements) {
      expect(element.position.equals(position)).toBe(true);
      expect(element.size.equals(size)).toBe(true);
      expect(element.rotation).toBe(15);
    }
  });

  it('validates every declared element type', () => {
    for (const element of allElements()) {
      expect(() => validateElement(element)).not.toThrow();
    }
  });

  it('rejects undefined rotation', () => {
    expect(() => validateTextElement(createTextElement({ rotation: undefined }))).toThrow(
      /rotation/,
    );
  });

  it('rejects non-finite rotation', () => {
    expect(() => validateTextElement(createTextElement({ rotation: NaN }))).toThrow(/rotation/);
  });

  it('rejects createdAt after updatedAt', () => {
    const bad = createTextElement({
      createdAt: new Date('2024-01-03T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    });
    expect(() => validateElement(bad)).toThrow(/createdAt/);
  });

  it('validates text element', () => {
    expect(() => validateTextElement(createTextElement())).not.toThrow();
    expect(() => validateTextElement(createTextElement({ content: undefined }))).toThrow(/content/);
  });

  it('validates note element', () => {
    expect(() => validateNoteElement(createNoteElement({ color: '#fff' }))).not.toThrow();
    expect(() => validateNoteElement(createNoteElement({ content: undefined }))).toThrow(/content/);
    expect(() => validateNoteElement(createNoteElement({ color: '   ' }))).toThrow(/color/);
  });

  it('validates task element', () => {
    expect(() => validateTaskElement(createTaskElement())).not.toThrow();
    expect(() => validateTaskElement(createTaskElement({ title: '   ' }))).toThrow(/title/);
    expect(() => validateTaskElement(createTaskElement({ dueDate: new Date('invalid') }))).toThrow(
      /dueDate/,
    );
    expect(() => validateTaskElement(createTaskElement({ dueDate: undefined }))).not.toThrow();
    expect(() => validateTaskElement(Object.assign(createTaskElement(), { status: '' }))).toThrow(
      /status/,
    );
  });

  it('validates frame element', () => {
    expect(() => validateFrameElement(createFrameElement())).not.toThrow();
    expect(() => validateFrameElement(createFrameElement({ title: '' }))).toThrow(/title/);
    expect(() =>
      validateFrameElement(
        createFrameElement({
          id: ElementId.create('self'),
          parentFrameId: ElementId.create('self'),
        }),
      ),
    ).toThrow(/parent/);
  });

  it('validates connector element', () => {
    expect(() => validateConnectorElement(createConnectorElement())).not.toThrow();
    expect(() =>
      validateConnectorElement(
        createConnectorElement({
          sourceElementId: ElementId.create('a'),
          targetElementId: ElementId.create('a'),
        }),
      ),
    ).toThrow(/same/);
  });

  it('validates link element', () => {
    expect(() => validateLinkElement(createLinkElement())).not.toThrow();
    expect(() => validateLinkElement(createLinkElement({ url: '' }))).toThrow(/url/);
    expect(() => validateLinkElement(createLinkElement({ title: '   ' }))).toThrow(/title/);
  });

  it('rejects untrusted element data with an unknown type', () => {
    const corrupted = Object.assign(createLinkElement(), { type: 'unknown' });
    expect(() => validateElement(corrupted)).toThrow(/Unknown element type/);
  });
});

describe('withRotation', () => {
  const updatedAt = new Date('2024-03-01T00:00:00Z');

  it('returns a new element with the provided rotation and timestamp', () => {
    const element = createTextElement({ rotation: 0 });
    const rotated = withRotation(element, 45, updatedAt);

    expect(rotated.rotation).toBe(45);
    expect(rotated.updatedAt).toBe(updatedAt);
    expect(rotated).not.toBe(element);
  });

  it('preserves the discriminant and type-specific fields for every element type', () => {
    for (const element of allElements()) {
      const rotated = withRotation(element, 30, updatedAt);

      expect(rotated.type).toBe(element.type);
      expect(rotated.id.equals(element.id)).toBe(true);
      expect(rotated.rotation).toBe(30);
    }
  });

  it('does not mutate the original element', () => {
    const element = createTaskElement({ rotation: 10 });
    const snapshot = { ...element };

    withRotation(element, 90, updatedAt);

    expect(element).toEqual(snapshot);
    expect(element.rotation).toBe(10);
  });

  it('rejects non-finite rotations', () => {
    expect(() => withRotation(createTextElement(), NaN, updatedAt)).toThrow(/rotation/);
    expect(() => withRotation(createTextElement(), Infinity, updatedAt)).toThrow(/rotation/);
  });

  it('rejects a timestamp older than createdAt', () => {
    const element = createTextElement({
      createdAt: new Date('2024-05-01T00:00:00Z'),
      updatedAt: new Date('2024-05-01T00:00:00Z'),
    });

    expect(() => withRotation(element, 10, new Date('2024-04-01T00:00:00Z'))).toThrow(/createdAt/);
  });
});
