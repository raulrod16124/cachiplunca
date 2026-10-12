import { ElementId } from '../shared/value-objects/element-id';
import { Position } from '../shared/value-objects/position';
import { Size } from '../shared/value-objects/size';
import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';
import { validateTextElement } from './element-types';
import type { TextElement } from './element-types';

export interface CreateTextElementProps {
  readonly id: ElementId;
  readonly workspaceId: WorkspaceId;
  readonly createdBy: UserId;
  readonly position: Position;
  readonly size: Size;
  readonly content: string;
  readonly rotation?: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export function createTextElement(props: CreateTextElementProps): TextElement {
  assertContentIsString(props.content);

  const now = new Date();
  const createdAt = props.createdAt ?? now;
  const updatedAt = props.updatedAt ?? createdAt;

  const element: TextElement = {
    id: props.id,
    workspaceId: props.workspaceId,
    type: 'text',
    position: props.position,
    size: props.size,
    rotation: props.rotation ?? 0,
    createdBy: props.createdBy,
    createdAt,
    updatedAt,
    content: props.content,
  };

  validateTextElement(element);

  return element;
}

export function withTextContent(
  element: TextElement,
  content: string,
  updatedAt: Date = new Date(),
): TextElement {
  assertContentIsString(content);

  const next: TextElement = { ...element, content, updatedAt };

  validateTextElement(next);

  return next;
}

function assertContentIsString(content: string): void {
  if (typeof content !== 'string') {
    throw new Error('TextElement content must be a string');
  }
}
