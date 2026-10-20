import {
  Bounds,
  Position,
  Size,
  type ElementId,
  type UserId,
  type Viewport,
  type WorkspaceId,
} from '../../domain/shared';
import { type Element, type ElementType, isConnectorElement } from '../../domain/element';
import type { CreateElementInput } from '../commands';

export type DirectCreatableElementType = Exclude<ElementType, 'connector'>;

export const DEFAULT_TEXT_CONTENT = '';
export const DEFAULT_NOTE_CONTENT = '';
export const DEFAULT_TASK_TITLE = 'New task';
export const DEFAULT_FRAME_TITLE = 'New frame';
export const DEFAULT_LINK_URL = 'https://example.com';
export const DEFAULT_IMAGE_SRC =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"/>';
export const DEFAULT_FREE_CONNECTOR_SIZE = Size.create(160, 40);

export const ELEMENT_DEFAULT_SIZES: Record<ElementType, Size> = {
  text: Size.create(160, 40),
  note: Size.create(200, 160),
  task: Size.create(220, 120),
  frame: Size.create(320, 240),
  connector: Size.create(0, 0),
  link: Size.create(220, 64),
  image: Size.create(320, 200),
};

export function defaultElementSize(type: ElementType): Size {
  return ELEMENT_DEFAULT_SIZES[type];
}

export interface ElementCreationPlacement {
  readonly workspaceId: WorkspaceId;
  readonly createdBy: UserId;
  readonly position: Position;
  readonly size: Size;
}

export function resolveElementCreatePosition(viewport: Viewport, size: Size): Position {
  const centerScreen = Position.create(viewport.size.width / 2, viewport.size.height / 2);
  const centerWorld = viewport.screenToWorld(centerScreen);

  return Position.create(centerWorld.x - size.width / 2, centerWorld.y - size.height / 2);
}

export function elementContentBounds(elements: readonly Element[]): Bounds | null {
  let bounds: Bounds | null = null;

  for (const element of elements) {
    const elementBounds = Bounds.of(element.position, element.size);
    bounds = bounds === null ? elementBounds : bounds.union(elementBounds);
  }

  return bounds;
}

export function connectorEndpoints(
  selectedIds: readonly string[],
): readonly [string, string] | null {
  if (selectedIds.length !== 2) {
    return null;
  }

  return [selectedIds[0], selectedIds[1]];
}

export function connectorCandidateIds(
  elements: readonly Element[],
  selectedIds: readonly string[],
): readonly [string, string] | null {
  if (selectedIds.length !== 2) {
    return null;
  }

  const selected = new Set(selectedIds);
  const candidates = elements.filter(
    (element) => selected.has(element.id.value) && !isConnectorElement(element),
  );

  if (candidates.length !== 2) {
    return null;
  }

  return [candidates[0].id.value, candidates[1].id.value];
}

export function buildElementCreateInput(
  type: DirectCreatableElementType,
  placement: ElementCreationPlacement,
): CreateElementInput {
  const base = toBase(placement);

  switch (type) {
    case 'text':
      return { ...base, type, content: DEFAULT_TEXT_CONTENT };
    case 'note':
      return { ...base, type, content: DEFAULT_NOTE_CONTENT };
    case 'task':
      return { ...base, type, title: DEFAULT_TASK_TITLE, status: 'todo' };
    case 'frame':
      return { ...base, type, title: DEFAULT_FRAME_TITLE };
    case 'link':
      return { ...base, type, url: DEFAULT_LINK_URL };
    case 'image':
      return { ...base, type, src: DEFAULT_IMAGE_SRC };
    default: {
      const unreachable: never = type;
      throw new Error(`Unsupported element type: ${JSON.stringify(unreachable)}`);
    }
  }
}

export function buildConnectorCreateInput(
  sourceElementId: ElementId,
  targetElementId: ElementId,
  placement: ElementCreationPlacement,
): CreateElementInput {
  return { ...toBase(placement), type: 'connector', sourceElementId, targetElementId };
}

export function buildFreeConnectorCreateInput(
  placement: ElementCreationPlacement,
): CreateElementInput {
  const { width, height } = placement.size;

  return {
    ...toBase(placement),
    type: 'connector',
    sourcePoint: Position.create(0, height / 2),
    targetPoint: Position.create(width, height / 2),
  };
}

function toBase(placement: ElementCreationPlacement): {
  readonly workspaceId: WorkspaceId;
  readonly createdBy: UserId;
  readonly position: Position;
  readonly size: Size;
} {
  return {
    workspaceId: placement.workspaceId,
    createdBy: placement.createdBy,
    position: placement.position,
    size: placement.size,
  };
}
