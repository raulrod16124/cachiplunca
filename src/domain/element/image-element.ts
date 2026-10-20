import { ElementId } from '../shared/value-objects/element-id';
import { Position } from '../shared/value-objects/position';
import { Size } from '../shared/value-objects/size';
import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';
import { validateImageElement } from './element-types';
import type { ImageElement } from './element-types';

export interface CreateImageElementProps {
  readonly id: ElementId;
  readonly workspaceId: WorkspaceId;
  readonly createdBy: UserId;
  readonly position: Position;
  readonly size: Size;
  readonly src: string;
  readonly alt?: string;
  readonly rotation?: number;
  readonly zIndex?: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export function createImageElement(props: CreateImageElementProps): ImageElement {
  assertSrc(props.src);
  assertAlt(props.alt);

  const now = new Date();
  const createdAt = props.createdAt ?? now;
  const updatedAt = props.updatedAt ?? createdAt;

  const element: ImageElement = {
    id: props.id,
    workspaceId: props.workspaceId,
    type: 'image',
    position: props.position,
    size: props.size,
    rotation: props.rotation ?? 0,
    zIndex: props.zIndex ?? 0,
    createdBy: props.createdBy,
    createdAt,
    updatedAt,
    src: props.src,
    ...(props.alt === undefined ? {} : { alt: props.alt }),
  };

  validateImageElement(element);

  return element;
}

export function withImageSrc(
  element: ImageElement,
  src: string,
  updatedAt: Date = new Date(),
): ImageElement {
  assertSrc(src);

  const next: ImageElement = { ...element, src, updatedAt };

  validateImageElement(next);

  return next;
}

export function withImageAlt(
  element: ImageElement,
  alt: string | undefined,
  updatedAt: Date = new Date(),
): ImageElement {
  assertAlt(alt);

  const next: ImageElement =
    alt === undefined ? { ...withoutImageAlt(element), updatedAt } : { ...element, alt, updatedAt };

  validateImageElement(next);

  return next;
}

function withoutImageAlt(element: ImageElement): Omit<ImageElement, 'alt'> {
  const { alt: _alt, ...rest } = element;
  void _alt;

  return rest;
}

function assertSrc(src: string): void {
  if (typeof src !== 'string' || src.trim().length === 0) {
    throw new Error('ImageElement src cannot be empty');
  }
}

function assertAlt(alt: string | undefined): void {
  if (alt !== undefined && typeof alt !== 'string') {
    throw new Error('ImageElement alt must be a string');
  }
}
