import { ElementId } from '../shared/value-objects/element-id';
import { Position } from '../shared/value-objects/position';
import { Size } from '../shared/value-objects/size';
import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';
import { isEmptyRichText, validateRichTextDocument, validateTitleDocument } from './rich-text';
import type { RichTextDocument } from './rich-text';

export const ELEMENT_TYPES = ['text', 'note', 'task', 'frame', 'connector', 'link'] as const;

export type ElementType = (typeof ELEMENT_TYPES)[number];

export interface BaseElement {
  readonly id: ElementId;
  readonly workspaceId: WorkspaceId;
  readonly type: ElementType;
  readonly position: Position;
  readonly size: Size;
  readonly rotation: number;
  readonly zIndex: number;
  readonly createdBy: UserId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface TextElement extends BaseElement {
  readonly type: 'text';
  readonly content: RichTextDocument;
}

export interface NoteElement extends BaseElement {
  readonly type: 'note';
  readonly content: RichTextDocument;
  readonly color?: string;
}

export const TASK_STATUSES = ['todo', 'in_progress', 'completed', 'blocked'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface TaskElement extends BaseElement {
  readonly type: 'task';
  readonly title: RichTextDocument;
  readonly status: TaskStatus;
  readonly notes?: RichTextDocument;
  readonly assigneeId?: UserId;
  readonly dueDate?: Date;
}

export interface FrameElement extends BaseElement {
  readonly type: 'frame';
  readonly title: RichTextDocument;
  readonly parentFrameId?: ElementId;
}

export interface ConnectorElement extends BaseElement {
  readonly type: 'connector';
  readonly sourceElementId?: ElementId;
  readonly targetElementId?: ElementId;
  readonly sourcePoint?: Position;
  readonly targetPoint?: Position;
}

export type ConnectorEndpoint =
  | { readonly kind: 'element'; readonly elementId: ElementId }
  | { readonly kind: 'point'; readonly point: Position };

export function connectorSourceEndpoint(element: ConnectorElement): ConnectorEndpoint {
  if (element.sourceElementId !== undefined) {
    return { kind: 'element', elementId: element.sourceElementId };
  }

  if (element.sourcePoint === undefined) {
    throw new Error('ConnectorElement source endpoint is not defined');
  }

  return { kind: 'point', point: element.sourcePoint };
}

export function connectorTargetEndpoint(element: ConnectorElement): ConnectorEndpoint {
  if (element.targetElementId !== undefined) {
    return { kind: 'element', elementId: element.targetElementId };
  }

  if (element.targetPoint === undefined) {
    throw new Error('ConnectorElement target endpoint is not defined');
  }

  return { kind: 'point', point: element.targetPoint };
}

export interface LinkElement extends BaseElement {
  readonly type: 'link';
  readonly url: string;
  readonly title?: RichTextDocument;
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

export function validateBaseElementProps(props: BaseElement): void {
  if (props.rotation === null || props.rotation === undefined) {
    throw new Error('Element rotation must be defined');
  }
  if (!Number.isFinite(props.rotation)) {
    throw new Error('Element rotation must be a finite number');
  }
  if (props.zIndex === null || props.zIndex === undefined) {
    throw new Error('Element zIndex must be defined');
  }
  if (!Number.isFinite(props.zIndex)) {
    throw new Error('Element zIndex must be a finite number');
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
  validateRichTextDocument(element.content);
}

export function validateNoteElement(element: NoteElement): void {
  validateBaseElementProps(element);
  if (element.content === undefined || element.content === null) {
    throw new Error('NoteElement content must be defined');
  }
  validateRichTextDocument(element.content);
  if (element.color !== undefined && element.color.trim().length === 0) {
    throw new Error('NoteElement color cannot be empty');
  }
}

export function validateTaskElement(element: TaskElement): void {
  validateBaseElementProps(element);
  validateRichTextDocument(element.title);
  validateTitleDocument(element.title);
  if (isEmptyRichText(element.title)) {
    throw new Error('TaskElement title cannot be empty');
  }
  if (element.status.trim().length === 0) {
    throw new Error('TaskElement status cannot be empty');
  }
  if (element.notes !== undefined) {
    validateRichTextDocument(element.notes);
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
  validateRichTextDocument(element.title);
  validateTitleDocument(element.title);
  if (isEmptyRichText(element.title)) {
    throw new Error('FrameElement title cannot be empty');
  }
  if (element.parentFrameId !== undefined && element.parentFrameId.equals(element.id)) {
    throw new Error('FrameElement cannot be its own parent');
  }
}

export function validateConnectorElement(element: ConnectorElement): void {
  validateBaseElementProps(element);

  const hasSourceElement = element.sourceElementId !== undefined;
  const hasSourcePoint = element.sourcePoint !== undefined;

  if (hasSourceElement === hasSourcePoint) {
    throw new Error(
      'ConnectorElement source must reference either an element or a free point, but not both',
    );
  }

  const hasTargetElement = element.targetElementId !== undefined;
  const hasTargetPoint = element.targetPoint !== undefined;

  if (hasTargetElement === hasTargetPoint) {
    throw new Error(
      'ConnectorElement target must reference either an element or a free point, but not both',
    );
  }

  if (
    hasSourceElement &&
    hasTargetElement &&
    element.sourceElementId !== undefined &&
    element.targetElementId !== undefined &&
    element.sourceElementId.equals(element.targetElementId)
  ) {
    throw new Error('ConnectorElement source and target cannot be the same');
  }

  if (
    hasSourcePoint &&
    hasTargetPoint &&
    element.sourcePoint !== undefined &&
    element.targetPoint !== undefined &&
    element.sourcePoint.equals(element.targetPoint)
  ) {
    throw new Error('ConnectorElement source and target cannot be the same point');
  }
}

export function validateLinkElement(element: LinkElement): void {
  validateBaseElementProps(element);
  if (element.url.trim().length === 0) {
    throw new Error('LinkElement url cannot be empty');
  }
  if (element.title !== undefined) {
    validateRichTextDocument(element.title);
    validateTitleDocument(element.title);
    if (isEmptyRichText(element.title)) {
      throw new Error('LinkElement title cannot be empty');
    }
  }
}

export function withRotation(
  element: Element,
  rotation: number,
  updatedAt: Date = new Date(),
): Element {
  if (!Number.isFinite(rotation)) {
    throw new Error('Element rotation must be a finite number');
  }

  const next: Element = { ...element, rotation, updatedAt };

  validateElement(next);

  return next;
}

export function withZIndex(
  element: Element,
  zIndex: number,
  updatedAt: Date = new Date(),
): Element {
  if (!Number.isFinite(zIndex)) {
    throw new Error('Element zIndex must be a finite number');
  }

  const next: Element = { ...element, zIndex, updatedAt };

  validateElement(next);

  return next;
}

export function withPosition(
  element: Element,
  position: Position,
  updatedAt: Date = new Date(),
): Element {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error('Element position must have finite coordinates');
  }

  const next: Element = { ...element, position, updatedAt };

  validateElement(next);

  return next;
}

export function withSize(element: Element, size: Size, updatedAt: Date = new Date()): Element {
  if (!Number.isFinite(size.width) || !Number.isFinite(size.height)) {
    throw new Error('Element size must have finite dimensions');
  }

  const next: Element = { ...element, size, updatedAt };

  validateElement(next);

  return next;
}

export interface DuplicateElementProps {
  readonly id: ElementId;
  readonly createdAt: Date;
  readonly updatedAt?: Date;
  readonly position?: Position;
}

export function duplicateElement(source: Element, props: DuplicateElementProps): Element {
  validateElement(source);

  if (Number.isNaN(props.createdAt.getTime())) {
    throw new Error('Duplicate element createdAt must be a valid Date');
  }

  if (
    props.position !== undefined &&
    (!Number.isFinite(props.position.x) || !Number.isFinite(props.position.y))
  ) {
    throw new Error('Duplicate element position must have finite coordinates');
  }

  const createdAt = props.createdAt;
  const updatedAt = props.updatedAt ?? createdAt;

  const next: Element = {
    ...source,
    id: props.id,
    position: props.position ?? source.position,
    createdAt,
    updatedAt,
  };

  validateElement(next);

  return next;
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
      const unknownType: never = element;
      throw new Error(`Unknown element type: ${JSON.stringify(unknownType)}`);
    }
  }
}
