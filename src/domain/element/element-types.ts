import { ElementId } from '../shared/value-objects/element-id';
import { Position } from '../shared/value-objects/position';
import { Size } from '../shared/value-objects/size';
import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';

export const ELEMENT_TYPES = ['text', 'note', 'task', 'frame', 'connector', 'link'] as const;

export type ElementType = (typeof ELEMENT_TYPES)[number];

export interface BaseElementProps {
  readonly id: ElementId;
  readonly workspaceId: WorkspaceId;
  readonly type: ElementType;
  readonly position: Position;
  readonly size: Size;
  readonly rotation: number;
  readonly createdBy: UserId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface TextElement extends BaseElementProps {
  readonly type: 'text';
  readonly content: string;
}

export interface NoteElement extends BaseElementProps {
  readonly type: 'note';
  readonly content: string;
  readonly color?: string;
}

export interface TaskStatus {
  readonly value: string;
}

export interface TaskElement extends BaseElementProps {
  readonly type: 'task';
  readonly title: string;
  readonly status: string;
  readonly assigneeId?: UserId;
  readonly dueDate?: Date;
}

export interface FrameElement extends BaseElementProps {
  readonly type: 'frame';
  readonly title: string;
  readonly parentFrameId?: ElementId;
}

export interface ConnectorElement extends BaseElementProps {
  readonly type: 'connector';
  readonly sourceElementId: ElementId;
  readonly targetElementId: ElementId;
}

export interface LinkElement extends BaseElementProps {
  readonly type: 'link';
  readonly url: string;
  readonly title?: string;
}

export type Element =
  TextElement | NoteElement | TaskElement | FrameElement | ConnectorElement | LinkElement;

export function isTextElement(element: Element): element is TextElement {
  return element.type === 'text';
}

export function isNoteElement(element: Element): element is NoteElement {
  return element.type === 'note';
}

export function isTaskElement(element: Element): element is TaskElement {
  return element.type === 'task';
}

export function isFrameElement(element: Element): element is FrameElement {
  return element.type === 'frame';
}

export function isConnectorElement(element: Element): element is ConnectorElement {
  return element.type === 'connector';
}

export function isLinkElement(element: Element): element is LinkElement {
  return element.type === 'link';
}

export function validateBaseElementProps(props: BaseElementProps): void {
  if (props.rotation === null || props.rotation === undefined) {
    throw new Error('Element rotation must be defined');
  }
  if (!Number.isFinite(props.rotation)) {
    throw new Error('Element rotation must be a finite number');
  }
  if (props.createdAt > props.updatedAt) {
    throw new Error('Element createdAt cannot be after updatedAt');
  }
}

export function validateTextElement(element: TextElement): void {
  validateBaseElementProps(element);
  if (element.content === undefined || element.content === null) {
    throw new Error('TextElement content must be defined');
  }
}

export function validateNoteElement(element: NoteElement): void {
  validateBaseElementProps(element);
  if (element.content === undefined || element.content === null) {
    throw new Error('NoteElement content must be defined');
  }
  if (element.color !== undefined && element.color.trim().length === 0) {
    throw new Error('NoteElement color cannot be empty');
  }
}

export function validateTaskElement(element: TaskElement): void {
  validateBaseElementProps(element);
  if (element.title.trim().length === 0) {
    throw new Error('TaskElement title cannot be empty');
  }
  if (element.status.trim().length === 0) {
    throw new Error('TaskElement status cannot be empty');
  }
  if (element.dueDate !== undefined && !(element.dueDate instanceof Date)) {
    throw new Error('TaskElement dueDate must be a Date');
  }
  if (element.dueDate !== undefined && isNaN(element.dueDate.getTime())) {
    throw new Error('TaskElement dueDate must be a valid Date');
  }
}

export function validateFrameElement(element: FrameElement): void {
  validateBaseElementProps(element);
  if (element.title.trim().length === 0) {
    throw new Error('FrameElement title cannot be empty');
  }
  if (element.parentFrameId !== undefined && element.parentFrameId.equals(element.id)) {
    throw new Error('FrameElement cannot be its own parent');
  }
}

export function validateConnectorElement(element: ConnectorElement): void {
  validateBaseElementProps(element);
  if (element.sourceElementId.equals(element.targetElementId)) {
    throw new Error('ConnectorElement source and target cannot be the same');
  }
}

export function validateLinkElement(element: LinkElement): void {
  validateBaseElementProps(element);
  if (element.url.trim().length === 0) {
    throw new Error('LinkElement url cannot be empty');
  }
  if (element.title !== undefined && element.title.trim().length === 0) {
    throw new Error('LinkElement title cannot be empty');
  }
}

export function validateElement(element: Element): void {
  switch (element.type) {
    case 'text':
      validateTextElement(element);
      break;
    case 'note':
      validateNoteElement(element);
      break;
    case 'task':
      validateTaskElement(element);
      break;
    case 'frame':
      validateFrameElement(element);
      break;
    case 'connector':
      validateConnectorElement(element);
      break;
    case 'link':
      validateLinkElement(element);
      break;
    default: {
      throw new Error(`Unknown element type`);
    }
  }
}
