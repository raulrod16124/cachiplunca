import {
  createConnectorElement,
  createFrameElement,
  createImageElement,
  createLinkElement,
  createNoteElement,
  createTaskElement,
  createTextElement,
  type Element,
  type RichTextDocument,
  type TaskStatus,
} from '../../domain/element';
import type { ElementId, Position, Size, UserId, WorkspaceId } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import { toValidationAppError } from './to-validation-app-error';

export interface CreateElementBaseInput {
  readonly workspaceId: WorkspaceId;
  readonly createdBy: UserId;
  readonly position: Position;
  readonly size: Size;
  readonly rotation?: number;
}

export type CreateElementInput =
  | (CreateElementBaseInput & {
      readonly type: 'text';
      readonly content?: RichTextDocument | string;
    })
  | (CreateElementBaseInput & {
      readonly type: 'note';
      readonly content: RichTextDocument | string;
      readonly color?: string;
    })
  | (CreateElementBaseInput & {
      readonly type: 'task';
      readonly title: RichTextDocument | string;
      readonly status: TaskStatus;
      readonly notes?: RichTextDocument | string;
      readonly assigneeId?: UserId;
      readonly dueDate?: Date;
    })
  | (CreateElementBaseInput & {
      readonly type: 'frame';
      readonly title: RichTextDocument | string;
      readonly parentFrameId?: ElementId;
    })
  | (CreateElementBaseInput & {
      readonly type: 'connector';
      readonly sourceElementId?: ElementId;
      readonly targetElementId?: ElementId;
      readonly sourcePoint?: Position;
      readonly targetPoint?: Position;
    })
  | (CreateElementBaseInput & {
      readonly type: 'link';
      readonly url: string;
      readonly title?: RichTextDocument | string;
    })
  | (CreateElementBaseInput & {
      readonly type: 'image';
      readonly src: string;
      readonly alt?: string;
    });

export interface CreateElementDeps {
  readonly generateId: () => ElementId;
  readonly now?: () => Date;
}

export type CreateElementResult =
  | { readonly status: 'ok'; readonly element: Element }
  | { readonly status: 'error'; readonly error: AppError };

export type CreateElement = (input: CreateElementInput) => CreateElementResult;

export function createCreateElement(deps: CreateElementDeps): CreateElement {
  return (input: CreateElementInput): CreateElementResult => {
    try {
      return { status: 'ok', element: buildElement(input, deps) };
    } catch (error) {
      return { status: 'error', error: toValidationAppError(error) };
    }
  };
}

function buildElement(input: CreateElementInput, deps: CreateElementDeps): Element {
  const base = {
    id: deps.generateId(),
    workspaceId: input.workspaceId,
    createdBy: input.createdBy,
    position: input.position,
    size: input.size,
    rotation: input.rotation,
    ...createTimestampOverrides(deps),
  };

  switch (input.type) {
    case 'text':
      return createTextElement({ ...base, content: input.content ?? '' });
    case 'note':
      return createNoteElement({ ...base, content: input.content, color: input.color });
    case 'task':
      return createTaskElement({
        ...base,
        title: input.title,
        status: input.status,
        notes: input.notes,
        assigneeId: input.assigneeId,
        dueDate: input.dueDate,
      });
    case 'frame':
      return createFrameElement({
        ...base,
        title: input.title,
        parentFrameId: input.parentFrameId,
      });
    case 'connector':
      return createConnectorElement({
        ...base,
        sourceElementId: input.sourceElementId,
        targetElementId: input.targetElementId,
        sourcePoint: input.sourcePoint,
        targetPoint: input.targetPoint,
      });
    case 'link':
      return createLinkElement({ ...base, url: input.url, title: input.title });
    case 'image':
      return createImageElement({ ...base, src: input.src, alt: input.alt });
    default: {
      const unknownType: never = input;
      throw new Error(`Unknown element type: ${JSON.stringify(unknownType)}`);
    }
  }
}

function createTimestampOverrides(deps: CreateElementDeps): { readonly createdAt?: Date } {
  if (deps.now === undefined) {
    return {};
  }
  return { createdAt: deps.now() };
}
