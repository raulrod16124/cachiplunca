import { ElementId } from '../shared/value-objects/element-id';
import { Position } from '../shared/value-objects/position';
import { Size } from '../shared/value-objects/size';
import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';
import { parseRichTextDocument, richTextFromPlain } from './rich-text';
import type { RichTextDocument } from './rich-text';
import { validateFrameElement } from './element-types';
import type { FrameElement } from './element-types';

export interface CreateFrameElementProps {
  readonly id: ElementId;
  readonly workspaceId: WorkspaceId;
  readonly createdBy: UserId;
  readonly position: Position;
  readonly size: Size;
  readonly title: RichTextDocument | string;
  readonly parentFrameId?: ElementId;
  readonly rotation?: number;
  readonly zIndex?: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export function createFrameElement(props: CreateFrameElementProps): FrameElement {
  const title = toRichTextDocument(props.title);
  assertParentFrameId(props.parentFrameId);

  const now = new Date();
  const createdAt = props.createdAt ?? now;
  const updatedAt = props.updatedAt ?? createdAt;

  const element: FrameElement = {
    id: props.id,
    workspaceId: props.workspaceId,
    type: 'frame',
    position: props.position,
    size: props.size,
    rotation: props.rotation ?? 0,
    zIndex: props.zIndex ?? 0,
    createdBy: props.createdBy,
    createdAt,
    updatedAt,
    title,
    ...(props.parentFrameId === undefined ? {} : { parentFrameId: props.parentFrameId }),
  };

  validateFrameElement(element);

  return element;
}

export function withFrameTitle(
  element: FrameElement,
  title: RichTextDocument | string,
  updatedAt: Date = new Date(),
): FrameElement {
  return buildFrameElement(element, { title: toRichTextDocument(title), updatedAt });
}

export function withFrameParent(
  element: FrameElement,
  parentFrameId: ElementId | undefined,
  updatedAt: Date = new Date(),
): FrameElement {
  assertParentFrameId(parentFrameId);

  return buildFrameElement(element, { parentFrameId, updatedAt });
}

interface FrameElementOverrides {
  readonly title?: RichTextDocument;
  readonly parentFrameId?: ElementId;
  readonly updatedAt: Date;
}

function buildFrameElement(element: FrameElement, overrides: FrameElementOverrides): FrameElement {
  const parentFrameId =
    'parentFrameId' in overrides ? overrides.parentFrameId : element.parentFrameId;

  const next: FrameElement = {
    id: element.id,
    workspaceId: element.workspaceId,
    type: 'frame',
    position: element.position,
    size: element.size,
    rotation: element.rotation,
    zIndex: element.zIndex,
    createdBy: element.createdBy,
    createdAt: element.createdAt,
    updatedAt: overrides.updatedAt,
    title: overrides.title ?? element.title,
    ...(parentFrameId === undefined ? {} : { parentFrameId }),
  };

  validateFrameElement(next);

  return next;
}

function toRichTextDocument(title: RichTextDocument | string | undefined): RichTextDocument {
  if (title === undefined) {
    throw new Error('FrameElement title must be defined');
  }

  if (typeof title === 'string') {
    if (title.trim().length === 0) {
      throw new Error('FrameElement title cannot be empty');
    }
    return richTextFromPlain(title);
  }

  return parseRichTextDocument(title);
}

function assertParentFrameId(parentFrameId: ElementId | undefined): void {
  if (parentFrameId !== undefined && !(parentFrameId instanceof ElementId)) {
    throw new Error('FrameElement parentFrameId must be an ElementId');
  }
}
