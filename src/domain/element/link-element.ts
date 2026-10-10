import { ElementId } from '../shared/value-objects/element-id';
import { Position } from '../shared/value-objects/position';
import { Size } from '../shared/value-objects/size';
import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';
import { validateLinkElement } from './element-types';
import type { LinkElement } from './element-types';

export interface CreateLinkElementProps {
  readonly id: ElementId;
  readonly workspaceId: WorkspaceId;
  readonly createdBy: UserId;
  readonly position: Position;
  readonly size: Size;
  readonly url: string;
  readonly title?: string;
  readonly rotation?: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export function createLinkElement(props: CreateLinkElementProps): LinkElement {
  assertUrl(props.url);
  assertTitle(props.title);

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
    createdBy: props.createdBy,
    createdAt,
    updatedAt,
    url: props.url,
    ...(props.title === undefined ? {} : { title: props.title }),
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
  title: string | undefined,
  updatedAt: Date = new Date(),
): LinkElement {
  assertTitle(title);

  return buildLinkElement(element, { title, updatedAt });
}

interface LinkElementOverrides {
  readonly url?: string;
  readonly title?: string;
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
    createdBy: element.createdBy,
    createdAt: element.createdAt,
    updatedAt: overrides.updatedAt,
    url: overrides.url ?? element.url,
    ...(title === undefined ? {} : { title }),
  };

  validateLinkElement(next);

  return next;
}

function assertUrl(url: string): void {
  if (typeof url !== 'string') {
    throw new Error('LinkElement url must be a string');
  }
  if (url.trim().length === 0) {
    throw new Error('LinkElement url cannot be empty');
  }
}

function assertTitle(title: string | undefined): void {
  if (title !== undefined && typeof title !== 'string') {
    throw new Error('LinkElement title must be a string');
  }
  if (title !== undefined && title.trim().length === 0) {
    throw new Error('LinkElement title cannot be empty');
  }
}
