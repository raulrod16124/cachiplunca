import {
  withConnectorSource,
  withConnectorTarget,
  withFrameParent,
  withFrameTitle,
  withLinkTitle,
  withLinkUrl,
  withNoteColor,
  withNoteContent,
  withRotation,
  withTaskAssignee,
  withTaskDueDate,
  withTaskStatus,
  withTaskTitle,
  withTextContent,
  type ConnectorElement,
  type Element,
  type FrameElement,
  type LinkElement,
  type NoteElement,
  type TaskElement,
  type TaskStatus,
} from '../../domain/element';
import type { ElementId, UserId } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import { toValidationAppError } from './to-validation-app-error';

interface UpdateElementBaseInput {
  readonly element: Element;
  readonly rotation?: number;
}

export type UpdateElementInput =
  | (UpdateElementBaseInput & { readonly type: 'text'; readonly content?: string })
  | (UpdateElementBaseInput & {
      readonly type: 'note';
      readonly content?: string;
      readonly color?: string;
    })
  | (UpdateElementBaseInput & {
      readonly type: 'task';
      readonly title?: string;
      readonly status?: TaskStatus;
      readonly assigneeId?: UserId | null;
      readonly dueDate?: Date | null;
    })
  | (UpdateElementBaseInput & {
      readonly type: 'frame';
      readonly title?: string;
      readonly parentFrameId?: ElementId | null;
    })
  | (UpdateElementBaseInput & {
      readonly type: 'connector';
      readonly sourceElementId?: ElementId;
      readonly targetElementId?: ElementId;
    })
  | (UpdateElementBaseInput & {
      readonly type: 'link';
      readonly url?: string;
      readonly title?: string | null;
    });

export interface UpdateElementDeps {
  readonly now?: () => Date;
}

export type UpdateElementResult =
  | { readonly status: 'ok'; readonly element: Element }
  | { readonly status: 'error'; readonly error: AppError };

export type UpdateElement = (input: UpdateElementInput) => UpdateElementResult;

export function createUpdateElement(deps: UpdateElementDeps = {}): UpdateElement {
  return (input: UpdateElementInput): UpdateElementResult => {
    try {
      return { status: 'ok', element: applyUpdate(input, resolveUpdatedAt(deps)) };
    } catch (error) {
      return { status: 'error', error: toValidationAppError(error) };
    }
  };
}

type TextPatch = Extract<UpdateElementInput, { readonly type: 'text' }>;
type NotePatch = Extract<UpdateElementInput, { readonly type: 'note' }>;
type TaskPatch = Extract<UpdateElementInput, { readonly type: 'task' }>;
type FramePatch = Extract<UpdateElementInput, { readonly type: 'frame' }>;
type ConnectorPatch = Extract<UpdateElementInput, { readonly type: 'connector' }>;
type LinkPatch = Extract<UpdateElementInput, { readonly type: 'link' }>;

function applyUpdate(input: UpdateElementInput, updatedAt: Date): Element {
  switch (input.type) {
    case 'text':
      return applyText(input, updatedAt);
    case 'note':
      return applyNote(input, updatedAt);
    case 'task':
      return applyTask(input, updatedAt);
    case 'frame':
      return applyFrame(input, updatedAt);
    case 'connector':
      return applyConnector(input, updatedAt);
    case 'link':
      return applyLink(input, updatedAt);
    default: {
      const unknownType: never = input;
      throw new Error(`Unknown element type: ${JSON.stringify(unknownType)}`);
    }
  }
}

function applyText(input: TextPatch, updatedAt: Date): Element {
  const { element } = input;
  assertElementType(element, 'text');

  if (input.content === undefined && input.rotation === undefined) {
    throw noChangesError();
  }

  const updated =
    input.content === undefined ? element : withTextContent(element, input.content, updatedAt);
  return applyRotation(input, updated, updatedAt);
}

function applyNote(input: NotePatch, updatedAt: Date): Element {
  const { element } = input;
  assertElementType(element, 'note');

  if (input.content === undefined && input.color === undefined && input.rotation === undefined) {
    throw noChangesError();
  }

  let updated: NoteElement = element;
  if (input.content !== undefined) {
    updated = withNoteContent(updated, input.content, updatedAt);
  }
  if (input.color !== undefined) {
    updated = withNoteColor(updated, input.color, updatedAt);
  }
  return applyRotation(input, updated, updatedAt);
}

function applyTask(input: TaskPatch, updatedAt: Date): Element {
  const { element } = input;
  assertElementType(element, 'task');

  const hasField =
    input.title !== undefined ||
    input.status !== undefined ||
    input.assigneeId !== undefined ||
    input.dueDate !== undefined ||
    input.rotation !== undefined;
  if (!hasField) {
    throw noChangesError();
  }

  let updated: TaskElement = element;
  if (input.title !== undefined) {
    updated = withTaskTitle(updated, input.title, updatedAt);
  }
  if (input.status !== undefined) {
    updated = withTaskStatus(updated, input.status, updatedAt);
  }
  if (input.assigneeId !== undefined) {
    updated = withTaskAssignee(updated, input.assigneeId ?? undefined, updatedAt);
  }
  if (input.dueDate !== undefined) {
    updated = withTaskDueDate(updated, input.dueDate ?? undefined, updatedAt);
  }
  return applyRotation(input, updated, updatedAt);
}

function applyFrame(input: FramePatch, updatedAt: Date): Element {
  const { element } = input;
  assertElementType(element, 'frame');

  if (
    input.title === undefined &&
    input.parentFrameId === undefined &&
    input.rotation === undefined
  ) {
    throw noChangesError();
  }

  let updated: FrameElement = element;
  if (input.title !== undefined) {
    updated = withFrameTitle(updated, input.title, updatedAt);
  }
  if (input.parentFrameId !== undefined) {
    updated = withFrameParent(updated, input.parentFrameId ?? undefined, updatedAt);
  }
  return applyRotation(input, updated, updatedAt);
}

function applyConnector(input: ConnectorPatch, updatedAt: Date): Element {
  const { element } = input;
  assertElementType(element, 'connector');

  if (
    input.sourceElementId === undefined &&
    input.targetElementId === undefined &&
    input.rotation === undefined
  ) {
    throw noChangesError();
  }

  let updated: ConnectorElement = element;
  if (input.sourceElementId !== undefined) {
    updated = withConnectorSource(updated, input.sourceElementId, updatedAt);
  }
  if (input.targetElementId !== undefined) {
    updated = withConnectorTarget(updated, input.targetElementId, updatedAt);
  }
  return applyRotation(input, updated, updatedAt);
}

function applyLink(input: LinkPatch, updatedAt: Date): Element {
  const { element } = input;
  assertElementType(element, 'link');

  if (input.url === undefined && input.title === undefined && input.rotation === undefined) {
    throw noChangesError();
  }

  let updated: LinkElement = element;
  if (input.url !== undefined) {
    updated = withLinkUrl(updated, input.url, updatedAt);
  }
  if (input.title !== undefined) {
    updated = withLinkTitle(updated, input.title ?? undefined, updatedAt);
  }
  return applyRotation(input, updated, updatedAt);
}

function applyRotation(
  input: { readonly rotation?: number },
  element: Element,
  updatedAt: Date,
): Element {
  return input.rotation === undefined ? element : withRotation(element, input.rotation, updatedAt);
}

function assertElementType<T extends Element['type']>(
  element: Element,
  expected: T,
): asserts element is Extract<Element, { readonly type: T }> {
  if (element.type !== expected) {
    throw new Error(`Cannot update a ${element.type} element with a ${expected} patch`);
  }
}

function noChangesError(): Error {
  return new Error('Provide at least one field to update');
}

function resolveUpdatedAt(deps: UpdateElementDeps): Date {
  return deps.now === undefined ? new Date() : deps.now();
}
