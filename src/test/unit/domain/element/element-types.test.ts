import {
  ELEMENT_TYPES,
  TASK_STATUSES,
  duplicateElement,
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
  withPosition,
  withRotation,
  withSize,
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

describe('withPosition', () => {
  const updatedAt = new Date('2024-03-01T00:00:00Z');

  it('returns a new element with the provided position and timestamp', () => {
    const element = createTextElement({ position: Position.create(0, 0) });
    const moved = withPosition(element, Position.create(12, 34), updatedAt);

    expect(moved.position.equals(Position.create(12, 34))).toBe(true);
    expect(moved.updatedAt).toBe(updatedAt);
    expect(moved).not.toBe(element);
  });

  it('preserves the discriminant and type-specific fields for every element type', () => {
    const position = Position.create(-5, 7.5);

    for (const element of allElements()) {
      const moved = withPosition(element, position, updatedAt);

      expect(moved.type).toBe(element.type);
      expect(moved.id.equals(element.id)).toBe(true);
      expect(moved.position.equals(position)).toBe(true);
    }
  });

  it('does not mutate the original element', () => {
    const element = createTaskElement({ position: Position.create(1, 2) });
    const snapshot = { ...element };

    withPosition(element, Position.create(9, 9), updatedAt);

    expect(element).toEqual(snapshot);
    expect(element.position.equals(Position.create(1, 2))).toBe(true);
  });

  it('rejects a timestamp older than createdAt', () => {
    const element = createTextElement({
      createdAt: new Date('2024-05-01T00:00:00Z'),
      updatedAt: new Date('2024-05-01T00:00:00Z'),
    });

    expect(() =>
      withPosition(element, Position.create(1, 1), new Date('2024-04-01T00:00:00Z')),
    ).toThrow(/createdAt/);
  });
});

describe('withSize', () => {
  const updatedAt = new Date('2024-03-01T00:00:00Z');

  it('returns a new element with the provided size and timestamp', () => {
    const element = createTextElement({ size: Size.create(10, 10) });
    const resized = withSize(element, Size.create(120, 34.5), updatedAt);

    expect(resized.size.equals(Size.create(120, 34.5))).toBe(true);
    expect(resized.updatedAt).toBe(updatedAt);
    expect(resized).not.toBe(element);
  });

  it('preserves the discriminant and type-specific fields for every element type', () => {
    const size = Size.create(250, 175);

    for (const element of allElements()) {
      const resized = withSize(element, size, updatedAt);

      expect(resized.type).toBe(element.type);
      expect(resized.id.equals(element.id)).toBe(true);
      expect(resized.size.equals(size)).toBe(true);
    }
  });

  it('does not mutate the original element', () => {
    const element = createTaskElement({ size: Size.create(30, 40) });
    const snapshot = { ...element };

    withSize(element, Size.create(99, 99), updatedAt);

    expect(element).toEqual(snapshot);
    expect(element.size.equals(Size.create(30, 40))).toBe(true);
  });

  it('rejects a non-finite size', () => {
    const element = createTextElement();
    const invalidSize = { width: Infinity, height: 10 } as Size;

    expect(() => withSize(element, invalidSize, updatedAt)).toThrow(/finite/);
  });

  it('rejects a timestamp older than createdAt', () => {
    const element = createTextElement({
      createdAt: new Date('2024-05-01T00:00:00Z'),
      updatedAt: new Date('2024-05-01T00:00:00Z'),
    });

    expect(() => withSize(element, Size.create(1, 1), new Date('2024-04-01T00:00:00Z'))).toThrow(
      /createdAt/,
    );
  });
});

describe('duplicateElement', () => {
  const createdAt = new Date('2024-03-01T00:00:00Z');

  it('returns a new element with the provided id and timestamps', () => {
    const element = createTextElement({ id: ElementId.create('original') });
    const copy = duplicateElement(element, { id: ElementId.create('copy'), createdAt });

    expect(copy).not.toBe(element);
    expect(copy.id.value).toBe('copy');
    expect(copy.createdAt).toBe(createdAt);
    expect(copy.updatedAt).toBe(createdAt);
  });

  it('preserves the discriminant, type-specific fields and shared metadata for every type', () => {
    const id = ElementId.create('copy');

    for (const element of allElements()) {
      const copy = duplicateElement(element, { id, createdAt });

      expect(copy.type).toBe(element.type);
      expect(copy.id.value).toBe('copy');
      expect(copy.workspaceId.equals(element.workspaceId)).toBe(true);
      expect(copy.createdBy.equals(element.createdBy)).toBe(true);
      expect(copy.position.equals(element.position)).toBe(true);
      expect(copy.size.equals(element.size)).toBe(true);
      expect(copy.rotation).toBe(element.rotation);
      expect(() => validateElement(copy)).not.toThrow();
    }
  });

  it('preserves the original id when it differs from the copy', () => {
    const element = createTextElement({ id: ElementId.create('original') });
    const copy = duplicateElement(element, { id: ElementId.create('copy'), createdAt });

    expect(copy.id.value).toBe('copy');
    expect(element.id.value).toBe('original');
  });

  it('applies an optional position overriding the source position', () => {
    const element = createTextElement({ position: Position.create(1, 2) });
    const copy = duplicateElement(element, {
      id: ElementId.create('copy'),
      createdAt,
      position: Position.create(50, 60),
    });

    expect(copy.position.equals(Position.create(50, 60))).toBe(true);
    expect(element.position.equals(Position.create(1, 2))).toBe(true);
  });

  it('uses the copy createdAt when no updatedAt is provided', () => {
    const copy = duplicateElement(createTextElement(), { id: ElementId.create('copy'), createdAt });

    expect(copy.updatedAt).toBe(createdAt);
  });

  it('does not mutate the original element', () => {
    const element = createTaskElement({ rotation: 10 });
    const snapshot = { ...element };

    duplicateElement(element, {
      id: ElementId.create('copy'),
      createdAt,
      position: Position.create(9, 9),
    });

    expect(element).toEqual(snapshot);
  });

  it('rejects an invalid createdAt', () => {
    expect(() =>
      duplicateElement(createTextElement(), {
        id: ElementId.create('copy'),
        createdAt: new Date('invalid'),
      }),
    ).toThrow(/createdAt/);
  });

  it('rejects a non-finite position', () => {
    expect(() =>
      duplicateElement(createTextElement(), {
        id: ElementId.create('copy'),
        createdAt,
        position: { x: Infinity, y: 0 } as Position,
      }),
    ).toThrow(/position/);
  });

  it('rejects a source element that violates its invariants', () => {
    const invalid = Object.assign(createTaskElement(), { title: '   ' });

    expect(() => duplicateElement(invalid, { id: ElementId.create('copy'), createdAt })).toThrow(
      /title/,
    );
  });

  it('rejects an invalid source before its metadata is overridden', () => {
    const invalid = createTextElement();
    Object.assign(invalid, {
      createdAt: new Date('2024-06-01T00:00:00Z'),
      updatedAt: new Date('2024-05-01T00:00:00Z'),
    });

    expect(() => duplicateElement(invalid, { id: ElementId.create('copy'), createdAt })).toThrow(
      /createdAt/,
    );
  });
});
