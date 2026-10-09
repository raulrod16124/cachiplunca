import {
  ElementId,
  Position,
  Size,
  UserId,
  WorkspaceId,
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
} from '../../shared';
import type {
  ConnectorElement,
  Element,
  FrameElement,
  LinkElement,
  NoteElement,
  TaskElement,
  TextElement,
} from '../element-types';
import {} from '../element-types';

const createBase = (type: any, overrides: Partial<any> = {}) => ({
  id: ElementId.create('elem-1'),
  workspaceId: WorkspaceId.create('ws-1'),
  type,
  position: Position.create(0, 0),
  size: Size.create(10, 10),
  rotation: 0,
  createdBy: UserId.create('user-1'),
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
  ...overrides,
});

describe('Element types', () => {
  it('distinguishes types with type narrowing', () => {
    const elements: Element[] = [
      createBase('text', { content: 'hello' }) as TextElement,
      createBase('note', { content: 'note', color: '#fff' }) as NoteElement,
      createBase('task', { title: 't', status: 'todo' }) as TaskElement,
      createBase('frame', { title: 'f' }) as FrameElement,
      createBase('connector', {
        sourceElementId: ElementId.create('a'),
        targetElementId: ElementId.create('b'),
      }) as ConnectorElement,
      createBase('link', { url: 'https://example.com' }) as LinkElement,
    ];

    const types = elements.map((e) => {
      if (isTextElement(e)) return 'text';
      if (isNoteElement(e)) return 'note';
      if (isTaskElement(e)) return 'task';
      if (isFrameElement(e)) return 'frame';
      if (isConnectorElement(e)) return 'connector';
      if (isLinkElement(e)) return 'link';
      return 'unknown';
    });

    expect(types).toEqual(['text', 'note', 'task', 'frame', 'connector', 'link']);
  });

  it('validates base invariants', () => {
    const base = createBase('text', { content: 'c' }) as TextElement;
    expect(() => validateElement(base)).not.toThrow();
    expect(() => validateTextElement(base)).not.toThrow();
  });

  it('rejects invalid rotation', () => {
    const bad = createBase('text', { content: 'c', rotation: NaN }) as TextElement;
    expect(() => validateElement(bad)).toThrow(/rotation/);
  });

  it('rejects createdAt after updatedAt', () => {
    const bad = createBase('text', {
      content: 'c',
      createdAt: new Date('2024-01-03T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    }) as TextElement;
    expect(() => validateElement(bad)).toThrow(/createdAt/);
  });

  it('validates text element', () => {
    const ok = createBase('text', { content: 'hi' }) as TextElement;
    expect(() => validateTextElement(ok)).not.toThrow();
    const bad = createBase('text', { content: undefined }) as any;
    expect(() => validateTextElement(bad)).toThrow(/content/);
  });

  it('validates note element', () => {
    const ok = createBase('note', { content: 'hi' }) as NoteElement;
    expect(() => validateNoteElement(ok)).not.toThrow();
    const bad = createBase('note', { content: undefined }) as any;
    expect(() => validateNoteElement(bad)).toThrow(/content/);
    const badColor = createBase('note', { content: 'hi', color: '   ' }) as any;
    expect(() => validateNoteElement(badColor)).toThrow(/color/);
  });

  it('validates task element', () => {
    const ok = createBase('task', { title: 't', status: 'todo' }) as TaskElement;
    expect(() => validateTaskElement(ok)).not.toThrow();
    const badTitle = createBase('task', { title: '   ', status: 'todo' }) as TaskElement;
    expect(() => validateTaskElement(badTitle)).toThrow(/title/);
    const badStatus = createBase('task', { title: 't', status: '' }) as TaskElement;
    expect(() => validateTaskElement(badStatus)).toThrow(/status/);
    const badDue = createBase('task', {
      title: 't',
      status: 'todo',
      dueDate: new Date('invalid'),
    }) as any;
    expect(() => validateTaskElement(badDue)).toThrow(/dueDate/);
  });

  it('validates frame element', () => {
    const ok = createBase('frame', { title: 'f' }) as FrameElement;
    expect(() => validateFrameElement(ok)).not.toThrow();
    const badTitle = createBase('frame', { title: '' }) as FrameElement;
    expect(() => validateFrameElement(badTitle)).toThrow(/title/);
    const badParent = createBase('frame', {
      title: 'f',
      id: ElementId.create('self'),
      parentFrameId: ElementId.create('self'),
    }) as FrameElement;
    expect(() => validateFrameElement(badParent)).toThrow(/parent/);
  });

  it('validates connector element', () => {
    const ok = createBase('connector', {
      sourceElementId: ElementId.create('a'),
      targetElementId: ElementId.create('b'),
    }) as ConnectorElement;
    expect(() => validateConnectorElement(ok)).not.toThrow();
    const bad = createBase('connector', {
      sourceElementId: ElementId.create('a'),
      targetElementId: ElementId.create('a'),
    }) as ConnectorElement;
    expect(() => validateConnectorElement(bad)).toThrow(/same/);
  });

  it('validates link element', () => {
    const ok = createBase('link', { url: 'https://x.com' }) as LinkElement;
    expect(() => validateLinkElement(ok)).not.toThrow();
    const badUrl = createBase('link', { url: '' }) as LinkElement;
    expect(() => validateLinkElement(badUrl)).toThrow(/url/);
    const badTitle = createBase('link', { url: 'https://x.com', title: '   ' }) as LinkElement;
    expect(() => validateLinkElement(badTitle)).toThrow(/title/);
  });

  it('validateElement switches by type', () => {
    const link = createBase('link', { url: 'https://x.com' }) as LinkElement;
    expect(() => validateElement(link)).not.toThrow();
    const bad = { ...link, type: 'unknown' } as any;
    expect(() => validateElement(bad)).toThrow(/Unknown element type/);
  });
});
