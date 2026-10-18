import { ElementId } from '../shared/value-objects/element-id';
import { Position } from '../shared/value-objects/position';
import { Size } from '../shared/value-objects/size';
import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';
import { parseRichTextDocument, richTextFromPlain } from './rich-text';
import type { RichTextDocument } from './rich-text';
import { validateLinkElement } from './element-types';
import type { LinkElement } from './element-types';

export interface CreateLinkElementProps {
  readonly id: ElementId;
  readonly workspaceId: WorkspaceId;
  readonly createdBy: UserId;
  readonly position: Position;
  readonly size: Size;
  readonly url: string;
  readonly title?: RichTextDocument | string;
  readonly rotation?: number;
  readonly zIndex?: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export function createLinkElement(props: CreateLinkElementProps): LinkElement {
  assertUrl(props.url);
  const title = props.title === undefined ? undefined : toRichTextDocument(props.title);

  const now = new Date();
  const createdAt = props.createdAt ?? now;
  const updatedAt = props.updatedAt ?? createdAt;

  const element: LinkElement = {
    id: props.id,
    workspaceId: props.workspaceId,
    type: 'link',
    position: props.position,
    size: props.size,
    rotation: props.rotation ?? 0,
    zIndex: props.zIndex ?? 0,
    createdBy: props.createdBy,
    createdAt,
    updatedAt,
    url: props.url,
    ...(title === undefined ? {} : { title }),
  };

  validateLinkElement(element);

  return element;
}

export function withLinkUrl(
  element: LinkElement,
  url: string,
  updatedAt: Date = new Date(),
): LinkElement {
  assertUrl(url);

  return buildLinkElement(element, { url, updatedAt });
}

export function withLinkTitle(
  element: LinkElement,
  title: RichTextDocument | string | undefined,
  updatedAt: Date = new Date(),
): LinkElement {
  const nextTitle = title === undefined ? undefined : toRichTextDocument(title);

  return buildLinkElement(element, { title: nextTitle, updatedAt });
}

interface LinkElementOverrides {
  readonly url?: string;
  readonly title?: RichTextDocument;
  readonly updatedAt: Date;
}

function buildLinkElement(element: LinkElement, overrides: LinkElementOverrides): LinkElement {
  const title = 'title' in overrides ? overrides.title : element.title;

  const next: LinkElement = {
    id: element.id,
    workspaceId: element.workspaceId,
    type: 'link',
    position: element.position,
    size: element.size,
    rotation: element.rotation,
    zIndex: element.zIndex,
    createdBy: element.createdBy,
    createdAt: element.createdAt,
    updatedAt: overrides.updatedAt,
    url: overrides.url ?? element.url,
    ...(title === undefined ? {} : { title }),
  };

  validateLinkElement(next);

  return next;
}

function toRichTextDocument(title: RichTextDocument | string | undefined): RichTextDocument {
  if (title === undefined) {
    throw new Error('LinkElement title must be defined');
  }

  if (typeof title === 'string') {
    if (title.trim().length === 0) {
      throw new Error('LinkElement title cannot be empty');
    }
    return richTextFromPlain(title);
  }

  return parseRichTextDocument(title);
}

function assertUrl(url: string): void {
  if (typeof url !== 'string') {
    throw new Error('LinkElement url must be a string');
  }
  if (url.trim().length === 0) {
    throw new Error('LinkElement url cannot be empty');
  }
}
