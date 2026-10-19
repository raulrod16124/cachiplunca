import {
  isConnectorElement,
  isFrameElement,
  validateElement,
  type ConnectorElement,
  type Element,
  type FrameElement,
} from '../../domain/element';
import { WORKSPACE_NAME_MAX_LENGTH } from '../../domain/workspace';
import type { ElementId, UserId, WorkspaceId } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import { toValidationAppError } from '../commands/to-validation-app-error';

export const DUPLICATE_WORKSPACE_NAME_PREFIX = 'Copy of ';

export interface BuildWorkspaceCopyElementsDeps {
  readonly targetWorkspaceId: WorkspaceId;
  readonly createdBy: UserId;
  readonly generateId: () => ElementId;
  readonly now?: () => Date;
}

export type BuildWorkspaceCopyElementsResult =
  | { readonly status: 'ok'; readonly elements: readonly Element[] }
  | { readonly status: 'error'; readonly error: AppError };

export function buildDuplicateWorkspaceName(sourceName: string): string {
  const base = sourceName.trim();
  const available = WORKSPACE_NAME_MAX_LENGTH - DUPLICATE_WORKSPACE_NAME_PREFIX.length;
  const suffix = base.length > available ? base.slice(0, available).trimEnd() : base;
  return `${DUPLICATE_WORKSPACE_NAME_PREFIX}${suffix}`;
}

export function buildWorkspaceCopyElements(
  elements: readonly Element[],
  deps: BuildWorkspaceCopyElementsDeps,
): BuildWorkspaceCopyElementsResult {
  try {
    const idsBySourceId = new Map<string, ElementId>();
    for (const element of elements) {
      idsBySourceId.set(element.id.value, deps.generateId());
    }

    const createdAt = deps.now === undefined ? new Date() : deps.now();
    const copies = elements.map((element) => copyElement(element, idsBySourceId, createdAt, deps));

    return { status: 'ok', elements: copies };
  } catch (error) {
    return { status: 'error', error: toValidationAppError(error) };
  }
}

function copyElement(
  element: Element,
  idsBySourceId: ReadonlyMap<string, ElementId>,
  timestamp: Date,
  deps: BuildWorkspaceCopyElementsDeps,
): Element {
  if (isConnectorElement(element)) {
    return copyConnector(element, idsBySourceId, timestamp, deps);
  }

  if (isFrameElement(element)) {
    return copyFrame(element, idsBySourceId, timestamp, deps);
  }

  const next: Element = {
    ...element,
    id: requireNewId(element, idsBySourceId),
    workspaceId: deps.targetWorkspaceId,
    createdBy: deps.createdBy,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  validateElement(next);
  return next;
}

function copyConnector(
  element: ConnectorElement,
  idsBySourceId: ReadonlyMap<string, ElementId>,
  timestamp: Date,
  deps: BuildWorkspaceCopyElementsDeps,
): ConnectorElement {
  const { sourceElementId, targetElementId, ...rest } = element;
  const remappedSource =
    sourceElementId === undefined
      ? undefined
      : remapElementId(sourceElementId, idsBySourceId, 'source');
  const remappedTarget =
    targetElementId === undefined
      ? undefined
      : remapElementId(targetElementId, idsBySourceId, 'target');

  const next: ConnectorElement = {
    ...rest,
    id: requireNewId(element, idsBySourceId),
    workspaceId: deps.targetWorkspaceId,
    createdBy: deps.createdBy,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(remappedSource === undefined ? {} : { sourceElementId: remappedSource }),
    ...(remappedTarget === undefined ? {} : { targetElementId: remappedTarget }),
  };

  validateElement(next);
  return next;
}

function copyFrame(
  element: FrameElement,
  idsBySourceId: ReadonlyMap<string, ElementId>,
  timestamp: Date,
  deps: BuildWorkspaceCopyElementsDeps,
): FrameElement {
  const { parentFrameId, ...rest } = element;
  const remappedParent =
    parentFrameId === undefined ? undefined : idsBySourceId.get(parentFrameId.value);

  const next: FrameElement = {
    ...rest,
    id: requireNewId(element, idsBySourceId),
    workspaceId: deps.targetWorkspaceId,
    createdBy: deps.createdBy,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(remappedParent === undefined ? {} : { parentFrameId: remappedParent }),
  };

  validateElement(next);
  return next;
}

function requireNewId(element: Element, idsBySourceId: ReadonlyMap<string, ElementId>): ElementId {
  const id = idsBySourceId.get(element.id.value);
  if (id === undefined) {
    throw new Error(`Missing copy id for element ${element.id.value}`);
  }
  return id;
}

function remapElementId(
  elementId: ElementId,
  idsBySourceId: ReadonlyMap<string, ElementId>,
  endpoint: 'source' | 'target',
): ElementId {
  const mapped = idsBySourceId.get(elementId.value);
  if (mapped === undefined) {
    throw new Error(`Connector ${endpoint} endpoint references an element outside the workspace`);
  }
  return mapped;
}
