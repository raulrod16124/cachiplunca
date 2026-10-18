import { ElementId } from '../shared/value-objects/element-id';
import { Position } from '../shared/value-objects/position';
import { Size } from '../shared/value-objects/size';
import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';
import { parseRichTextDocument, richTextFromPlain } from './rich-text';
import type { RichTextDocument } from './rich-text';
import { validateNoteElement } from './element-types';
import type { NoteElement } from './element-types';

export interface CreateNoteElementProps {
  readonly id: ElementId;
  readonly workspaceId: WorkspaceId;
  readonly createdBy: UserId;
  readonly position: Position;
  readonly size: Size;
  readonly content: RichTextDocument | string;
  readonly color?: string;
  readonly rotation?: number;
  readonly zIndex?: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export function createNoteElement(props: CreateNoteElementProps): NoteElement {
  const content = toRichTextDocument(props.content);
  assertColorIsString(props.color);

  const now = new Date();
  const createdAt = props.createdAt ?? now;
  const updatedAt = props.updatedAt ?? createdAt;

  const element: NoteElement = {
    id: props.id,
    workspaceId: props.workspaceId,
    type: 'note',
    position: props.position,
    size: props.size,
    rotation: props.rotation ?? 0,
    zIndex: props.zIndex ?? 0,
    createdBy: props.createdBy,
    createdAt,
    updatedAt,
    content,
    ...(props.color === undefined ? {} : { color: props.color }),
  };

  validateNoteElement(element);

  return element;
}

export function withNoteContent(
  element: NoteElement,
  content: RichTextDocument | string,
  updatedAt: Date = new Date(),
): NoteElement {
  const next: NoteElement = { ...element, content: toRichTextDocument(content), updatedAt };

  validateNoteElement(next);

  return next;
}

export function withNoteColor(
  element: NoteElement,
  color: string,
  updatedAt: Date = new Date(),
): NoteElement {
  assertColorIsString(color);

  const next: NoteElement = { ...element, color, updatedAt };

  validateNoteElement(next);

  return next;
}

function toRichTextDocument(content: RichTextDocument | string | undefined): RichTextDocument {
  if (content === undefined) {
    throw new Error('NoteElement content must be defined');
  }

  if (typeof content === 'string') {
    return richTextFromPlain(content);
  }

  return parseRichTextDocument(content);
}

function assertColorIsString(color: string | undefined): void {
  if (color !== undefined && typeof color !== 'string') {
    throw new Error('NoteElement color must be a string');
  }
}
