import {
  createConnectorElement,
  createFrameElement,
  createLinkElement,
  createNoteElement,
  createTaskElement,
  createTextElement,
  ELEMENT_TYPES,
  parseRichTextDocument,
  richTextFromPlain,
  type Element,
  type ElementType,
  type RichTextDocument,
} from '../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../domain/shared';

interface BaseElementDocument {
  readonly type: ElementType;
  readonly workspaceId: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly size: { readonly width: number; readonly height: number };
  readonly rotation: number;
  readonly zIndex: number;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface TextElementDocument extends BaseElementDocument {
  readonly type: 'text';
  readonly content: RichTextDocument;
}

export interface NoteElementDocument extends BaseElementDocument {
  readonly type: 'note';
  readonly content: string;
  readonly color?: string;
}

export interface TaskElementDocument extends BaseElementDocument {
  readonly type: 'task';
  readonly title: string;
  readonly status: 'todo' | 'in_progress' | 'done';
  readonly assigneeId?: string;
  readonly dueDate?: Date;
}

export interface FrameElementDocument extends BaseElementDocument {
  readonly type: 'frame';
  readonly title: string;
  readonly parentFrameId?: string;
}

export interface ConnectorElementDocument extends BaseElementDocument {
  readonly type: 'connector';
  readonly sourceElementId: string;
  readonly targetElementId: string;
}

export interface LinkElementDocument extends BaseElementDocument {
  readonly type: 'link';
  readonly url: string;
  readonly title?: string;
}

export type ElementDocument =
  | TextElementDocument
  | NoteElementDocument
  | TaskElementDocument
  | FrameElementDocument
  | ConnectorElementDocument
  | LinkElementDocument;

export function toElementDocument(element: Element): ElementDocument {
  const base: BaseElementDocument = {
    type: element.type,
    workspaceId: element.workspaceId.value,
    position: element.position.toJSON(),
    size: element.size.toJSON(),
    rotation: element.rotation,
    zIndex: element.zIndex,
    createdBy: element.createdBy.value,
    createdAt: element.createdAt,
    updatedAt: element.updatedAt,
  };

  switch (element.type) {
    case 'text':
      return { ...base, type: 'text' as const, content: element.content } as TextElementDocument;
    case 'note':
      return {
        ...base,
        type: 'note' as const,
        content: element.content,
        ...(element.color === undefined ? {} : { color: element.color }),
      } as NoteElementDocument;
    case 'task':
      return {
        ...base,
        type: 'task' as const,
        title: element.title,
        status: element.status,
        ...(element.assigneeId === undefined ? {} : { assigneeId: element.assigneeId.value }),
        ...(element.dueDate === undefined ? {} : { dueDate: element.dueDate }),
      } as TaskElementDocument;
    case 'frame':
      return {
        ...base,
        type: 'frame' as const,
        title: element.title,
        ...(element.parentFrameId === undefined
          ? {}
          : { parentFrameId: element.parentFrameId.value }),
      } as FrameElementDocument;
    case 'connector':
      return {
        ...base,
        type: 'connector' as const,
        sourceElementId: element.sourceElementId.value,
        targetElementId: element.targetElementId.value,
      } as ConnectorElementDocument;
    case 'link':
      return {
        ...base,
        type: 'link' as const,
        url: element.url,
        ...(element.title === undefined ? {} : { title: element.title }),
      } as LinkElementDocument;
  }
}

export function fromElementDocument(id: string, data: unknown): Element {
  if (!isRecord(data)) {
    throw new Error('Element document must be an object');
  }

  const type = readType(data.type);
  const base = readBaseElementProps(id, data);

  switch (type) {
    case 'text':
      return createTextElement({ ...base, content: readRichText(data.content) });
    case 'note':
      return createNoteElement({
        ...base,
        content: readString(data.content, 'content'),
        ...(data.color === undefined ? {} : { color: readString(data.color, 'color') }),
      });
    case 'task':
      return createTaskElement({
        ...base,
        title: readString(data.title, 'title'),
        status: readTaskStatus(data.status),
        ...(data.assigneeId === undefined
          ? {}
          : { assigneeId: UserId.create(readString(data.assigneeId, 'assigneeId')) }),
        ...(data.dueDate === undefined ? {} : { dueDate: readDate(data.dueDate, 'dueDate') }),
      });
    case 'frame':
      return createFrameElement({
        ...base,
        title: readString(data.title, 'title'),
        ...(data.parentFrameId === undefined
          ? {}
          : { parentFrameId: ElementId.create(readString(data.parentFrameId, 'parentFrameId')) }),
      });
    case 'connector':
      return createConnectorElement({
        ...base,
        sourceElementId: ElementId.create(readString(data.sourceElementId, 'sourceElementId')),
        targetElementId: ElementId.create(readString(data.targetElementId, 'targetElementId')),
      });
    case 'link':
      return createLinkElement({
        ...base,
        url: readString(data.url, 'url'),
        ...(data.title === undefined ? {} : { title: readString(data.title, 'title') }),
      });
  }
}

function readType(value: unknown): ElementType {
  if (typeof value !== 'string' || !ELEMENT_TYPES.includes(value as ElementType)) {
    throw new Error(`Element document field "type" must be one of: ${ELEMENT_TYPES.join(', ')}`);
  }
  return value as ElementType;
}

function readBaseElementProps(id: string, data: Record<string, unknown>) {
  return {
    id: ElementId.create(id),
    workspaceId: WorkspaceId.create(readString(data.workspaceId, 'workspaceId')),
    position: readPosition(data.position),
    size: readSize(data.size),
    rotation: readNumber(data.rotation, 'rotation'),
    ...(data.zIndex === undefined ? {} : { zIndex: readNumber(data.zIndex, 'zIndex') }),
    createdBy: UserId.create(readString(data.createdBy, 'createdBy')),
    createdAt: readDate(data.createdAt, 'createdAt'),
    updatedAt: readDate(data.updatedAt, 'updatedAt'),
  };
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Element document field "${field}" must be a string`);
  }
  return value;
}

function readRichText(value: unknown): RichTextDocument {
  if (typeof value === 'string') {
    return richTextFromPlain(value);
  }
  return parseRichTextDocument(value);
}

function readNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Element document field "${field}" must be a finite number`);
  }
  return value;
}

function readNonNegativeNumber(value: unknown, field: string): number {
  const number = readNumber(value, field);
  if (number < 0) {
    throw new Error(`Element document field "${field}" cannot be negative`);
  }
  return number;
}

function readPosition(value: unknown): Position {
  if (!isRecord(value)) {
    throw new Error('Element document field "position" must be an object');
  }
  return Position.create(readNumber(value.x, 'position.x'), readNumber(value.y, 'position.y'));
}

function readSize(value: unknown): Size {
  if (!isRecord(value)) {
    throw new Error('Element document field "size" must be an object');
  }
  return Size.create(
    readNonNegativeNumber(value.width, 'size.width'),
    readNonNegativeNumber(value.height, 'size.height'),
  );
}

function readTaskStatus(value: unknown): 'todo' | 'in_progress' | 'done' {
  const status = readString(value, 'status');
  if (status !== 'todo' && status !== 'in_progress' && status !== 'done') {
    throw new Error('Element document field "status" must be a valid task status');
  }
  return status;
}

function readDate(value: unknown, field: string): Date {
  const date = toDate(value);
  if (date === undefined) {
    throw new Error(`Element document field "${field}" must be a Date or Timestamp`);
  }
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Element document field "${field}" must be a valid Date`);
  }
  return date;
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return value;
  }
  if (isRecord(value) && typeof value.toDate === 'function') {
    const date: unknown = value.toDate();
    if (date instanceof Date) {
      return date;
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
