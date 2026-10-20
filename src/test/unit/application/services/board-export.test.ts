import {
  createConnectorElement,
  createFrameElement,
  createImageElement,
  createLinkElement,
  createNoteElement,
  createTaskElement,
  createTextElement,
  richTextFromPlain,
  type Element,
} from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import {
  BOARD_EXPORT_VERSION,
  boardExportToJson,
  createBoardExportFileName,
  serializeBoardExport,
} from '../../../../application/services/board-export';

const WORKSPACE_ID = WorkspaceId.create('ws-export');
const CREATED_BY = UserId.create('user-author');
const ASSIGNEE = UserId.create('user-assignee');
const CREATED_AT = new Date('2026-10-01T10:00:00.000Z');
const UPDATED_AT = new Date('2026-10-02T11:30:00.000Z');
const EXPORTED_AT = new Date('2026-10-19T12:00:00.000Z');

function base(id: string) {
  return {
    id: ElementId.create(id),
    workspaceId: WORKSPACE_ID,
    createdBy: CREATED_BY,
    position: Position.create(10, 20),
    size: Size.create(100, 80),
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  };
}

const ELEMENTS: readonly Element[] = [
  createTextElement({ ...base('text-1'), content: 'Hello board' }),
  createNoteElement({ ...base('note-1'), content: 'A note', color: '#ffeeaa' }),
  createTaskElement({
    ...base('task-1'),
    title: 'Ship export',
    status: 'in_progress',
    notes: 'Keep it simple',
    assigneeId: ASSIGNEE,
    dueDate: new Date('2026-10-30T00:00:00.000Z'),
  }),
  createFrameElement({
    ...base('frame-1'),
    title: 'Release 1',
    parentFrameId: ElementId.create('frame-parent'),
  }),
  createConnectorElement({
    ...base('connector-1'),
    sourcePoint: Position.create(0, 0),
    targetPoint: Position.create(40, 20),
  }),
  createLinkElement({
    ...base('link-1'),
    url: 'https://example.com/docs',
    title: 'Docs',
  }),
  createImageElement({
    ...base('image-1'),
    src: 'https://example.com/image.png',
    alt: 'Diagram',
  }),
];

describe('board export', () => {
  it('serializes a versioned envelope with every element', () => {
    const exported = serializeBoardExport({
      workspaceId: WORKSPACE_ID.value,
      exportedAt: EXPORTED_AT,
      elements: ELEMENTS,
    });

    expect(exported.version).toBe(BOARD_EXPORT_VERSION);
    expect(exported.workspaceId).toBe('ws-export');
    expect(exported.exportedAt).toBe('2026-10-19T12:00:00.000Z');
    expect(exported.elements).toHaveLength(ELEMENTS.length);
    expect(exported.elements.map((element) => element.type)).toEqual([
      'text',
      'note',
      'task',
      'frame',
      'connector',
      'link',
      'image',
    ]);
  });

  it('keeps type-specific data and serializes dates as ISO strings', () => {
    const exported = serializeBoardExport({
      workspaceId: WORKSPACE_ID.value,
      exportedAt: EXPORTED_AT,
      elements: ELEMENTS,
    });

    expect(exported.elements[0]).toEqual(
      expect.objectContaining({
        id: 'text-1',
        type: 'text',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-02T11:30:00.000Z',
      }),
    );
    expect(exported.elements[1]).toEqual(expect.objectContaining({ color: '#ffeeaa' }));
    expect(exported.elements[2]).toEqual(
      expect.objectContaining({
        status: 'in_progress',
        dueDate: '2026-10-30T00:00:00.000Z',
        notes: richTextFromPlain('Keep it simple'),
      }),
    );
    expect(exported.elements[3]).toEqual(
      expect.objectContaining({ parentFrameId: 'frame-parent' }),
    );
    expect(exported.elements[4]).toEqual(
      expect.objectContaining({
        sourcePoint: { x: 0, y: 0 },
        targetPoint: { x: 40, y: 20 },
      }),
    );
    expect(exported.elements[5]).toEqual(
      expect.objectContaining({ url: 'https://example.com/docs' }),
    );
    expect(exported.elements[6]).toEqual(
      expect.objectContaining({ src: 'https://example.com/image.png', alt: 'Diagram' }),
    );
  });

  it('does not include user identifiers or sensitive author data', () => {
    const json = boardExportToJson(
      serializeBoardExport({
        workspaceId: WORKSPACE_ID.value,
        exportedAt: EXPORTED_AT,
        elements: ELEMENTS,
      }),
    );

    expect(json).not.toContain('createdBy');
    expect(json).not.toContain('assigneeId');
    expect(json).not.toContain('user-author');
    expect(json).not.toContain('user-assignee');
  });

  it('produces JSON that round-trips to the same envelope', () => {
    const exported = serializeBoardExport({
      workspaceId: WORKSPACE_ID.value,
      exportedAt: EXPORTED_AT,
      elements: ELEMENTS,
    });

    expect(JSON.parse(boardExportToJson(exported))).toEqual(exported);
  });

  it('does not mutate the source elements', () => {
    const before = ELEMENTS.map((element) => element.updatedAt.getTime());

    serializeBoardExport({
      workspaceId: WORKSPACE_ID.value,
      exportedAt: EXPORTED_AT,
      elements: ELEMENTS,
    });

    expect(ELEMENTS.map((element) => element.updatedAt.getTime())).toEqual(before);
  });

  it('builds a readable, slugged file name with the export date', () => {
    expect(createBoardExportFileName('Roadmap Q4', EXPORTED_AT, 'json')).toBe(
      'roadmap-q4-2026-10-19.json',
    );
    expect(createBoardExportFileName('Planificación año nuevo', EXPORTED_AT, 'pdf')).toBe(
      'planificacion-ano-nuevo-2026-10-19.pdf',
    );
    expect(createBoardExportFileName('  ', EXPORTED_AT, 'json')).toBe('workspace-2026-10-19.json');
  });
});
