import type { Element, ElementType, RichTextDocument, TaskStatus } from '../../domain/element';

export const BOARD_EXPORT_VERSION = 1;

export interface BoardExportPosition {
  readonly x: number;
  readonly y: number;
}

export interface BoardExportSize {
  readonly width: number;
  readonly height: number;
}

interface BaseBoardExportElement {
  readonly id: string;
  readonly workspaceId: string;
  readonly type: ElementType;
  readonly position: BoardExportPosition;
  readonly size: BoardExportSize;
  readonly rotation: number;
  readonly zIndex: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TextBoardExportElement extends BaseBoardExportElement {
  readonly type: 'text';
  readonly content: RichTextDocument;
}

export interface NoteBoardExportElement extends BaseBoardExportElement {
  readonly type: 'note';
  readonly content: RichTextDocument;
  readonly color?: string;
}

export interface TaskBoardExportElement extends BaseBoardExportElement {
  readonly type: 'task';
  readonly title: RichTextDocument;
  readonly status: TaskStatus;
  readonly notes?: RichTextDocument;
  readonly dueDate?: string;
}

export interface FrameBoardExportElement extends BaseBoardExportElement {
  readonly type: 'frame';
  readonly title: RichTextDocument;
  readonly parentFrameId?: string;
}

export interface ConnectorBoardExportElement extends BaseBoardExportElement {
  readonly type: 'connector';
  readonly sourceElementId?: string;
  readonly targetElementId?: string;
  readonly sourcePoint?: BoardExportPosition;
  readonly targetPoint?: BoardExportPosition;
}

export interface LinkBoardExportElement extends BaseBoardExportElement {
  readonly type: 'link';
  readonly url: string;
  readonly title?: RichTextDocument;
}

export type BoardExportElement =
  | TextBoardExportElement
  | NoteBoardExportElement
  | TaskBoardExportElement
  | FrameBoardExportElement
  | ConnectorBoardExportElement
  | LinkBoardExportElement;

export interface BoardExport {
  readonly version: number;
  readonly workspaceId: string;
  readonly exportedAt: string;
  readonly elements: readonly BoardExportElement[];
}

export interface SerializeBoardExportInput {
  readonly workspaceId: string;
  readonly exportedAt: Date;
  readonly elements: readonly Element[];
}

export function serializeBoardExport({
  workspaceId,
  exportedAt,
  elements,
}: SerializeBoardExportInput): BoardExport {
  return {
    version: BOARD_EXPORT_VERSION,
    workspaceId,
    exportedAt: exportedAt.toISOString(),
    elements: elements.map(toBoardExportElement),
  };
}

export function boardExportToJson(boardExport: BoardExport): string {
  return JSON.stringify(boardExport, null, 2);
}

export type BoardExportFileExtension = 'json' | 'pdf';

export function createBoardExportFileName(
  workspaceName: string,
  exportedAt: Date,
  extension: BoardExportFileExtension,
): string {
  return `${slugifyWorkspaceName(workspaceName)}-${exportedAt.toISOString().slice(0, 10)}.${extension}`;
}

function slugifyWorkspaceName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug.length === 0 ? 'workspace' : slug;
}

function toBoardExportElement(element: Element): BoardExportElement {
  const base: BaseBoardExportElement = {
    id: element.id.value,
    workspaceId: element.workspaceId.value,
    type: element.type,
    position: element.position.toJSON(),
    size: element.size.toJSON(),
    rotation: element.rotation,
    zIndex: element.zIndex,
    createdAt: element.createdAt.toISOString(),
    updatedAt: element.updatedAt.toISOString(),
  };

  switch (element.type) {
    case 'text':
      return { ...base, type: 'text', content: element.content };
    case 'note':
      return {
        ...base,
        type: 'note',
        content: element.content,
        ...(element.color === undefined ? {} : { color: element.color }),
      };
    case 'task':
      return {
        ...base,
        type: 'task',
        title: element.title,
        status: element.status,
        ...(element.notes === undefined ? {} : { notes: element.notes }),
        ...(element.dueDate === undefined ? {} : { dueDate: element.dueDate.toISOString() }),
      };
    case 'frame':
      return {
        ...base,
        type: 'frame',
        title: element.title,
        ...(element.parentFrameId === undefined
          ? {}
          : { parentFrameId: element.parentFrameId.value }),
      };
    case 'connector':
      return {
        ...base,
        type: 'connector',
        ...(element.sourceElementId === undefined
          ? {}
          : { sourceElementId: element.sourceElementId.value }),
        ...(element.targetElementId === undefined
          ? {}
          : { targetElementId: element.targetElementId.value }),
        ...(element.sourcePoint === undefined ? {} : { sourcePoint: element.sourcePoint.toJSON() }),
        ...(element.targetPoint === undefined ? {} : { targetPoint: element.targetPoint.toJSON() }),
      };
    case 'link':
      return {
        ...base,
        type: 'link',
        url: element.url,
        ...(element.title === undefined ? {} : { title: element.title }),
      };
    default: {
      const unreachable: never = element;
      throw new Error(`Unknown element type: ${JSON.stringify(unreachable)}`);
    }
  }
}
