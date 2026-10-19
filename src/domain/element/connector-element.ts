import { ElementId } from '../shared/value-objects/element-id';
import { Position } from '../shared/value-objects/position';
import { Size } from '../shared/value-objects/size';
import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';
import { validateConnectorElement } from './element-types';
import type { ConnectorElement, ConnectorEndpoint } from './element-types';

export interface CreateConnectorElementProps {
  readonly id: ElementId;
  readonly workspaceId: WorkspaceId;
  readonly createdBy: UserId;
  readonly position: Position;
  readonly size: Size;
  readonly sourceElementId?: ElementId;
  readonly targetElementId?: ElementId;
  readonly sourcePoint?: Position;
  readonly targetPoint?: Position;
  readonly rotation?: number;
  readonly zIndex?: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export function createConnectorElement(props: CreateConnectorElementProps): ConnectorElement {
  if (props.sourceElementId !== undefined) {
    assertElementId(props.sourceElementId, 'sourceElementId');
  }
  if (props.targetElementId !== undefined) {
    assertElementId(props.targetElementId, 'targetElementId');
  }
  if (props.sourcePoint !== undefined && !(props.sourcePoint instanceof Position)) {
    throw new Error('ConnectorElement sourcePoint must be a Position');
  }
  if (props.targetPoint !== undefined && !(props.targetPoint instanceof Position)) {
    throw new Error('ConnectorElement targetPoint must be a Position');
  }

  const now = new Date();
  const createdAt = props.createdAt ?? now;
  const updatedAt = props.updatedAt ?? createdAt;

  const element: ConnectorElement = {
    id: props.id,
    workspaceId: props.workspaceId,
    type: 'connector',
    position: props.position,
    size: props.size,
    rotation: props.rotation ?? 0,
    zIndex: props.zIndex ?? 0,
    createdBy: props.createdBy,
    createdAt,
    updatedAt,
    ...(props.sourceElementId === undefined ? {} : { sourceElementId: props.sourceElementId }),
    ...(props.targetElementId === undefined ? {} : { targetElementId: props.targetElementId }),
    ...(props.sourcePoint === undefined ? {} : { sourcePoint: props.sourcePoint }),
    ...(props.targetPoint === undefined ? {} : { targetPoint: props.targetPoint }),
  };

  validateConnectorElement(element);

  return element;
}

export function withConnectorSource(
  element: ConnectorElement,
  sourceElementId: ElementId,
  updatedAt: Date = new Date(),
): ConnectorElement {
  return withConnectorSourceEndpoint(
    element,
    { kind: 'element', elementId: sourceElementId },
    updatedAt,
  );
}

export function withConnectorTarget(
  element: ConnectorElement,
  targetElementId: ElementId,
  updatedAt: Date = new Date(),
): ConnectorElement {
  return withConnectorTargetEndpoint(
    element,
    { kind: 'element', elementId: targetElementId },
    updatedAt,
  );
}

export function withConnectorSourcePoint(
  element: ConnectorElement,
  point: Position,
  updatedAt: Date = new Date(),
): ConnectorElement {
  return withConnectorSourceEndpoint(element, { kind: 'point', point }, updatedAt);
}

export function withConnectorTargetPoint(
  element: ConnectorElement,
  point: Position,
  updatedAt: Date = new Date(),
): ConnectorElement {
  return withConnectorTargetEndpoint(element, { kind: 'point', point }, updatedAt);
}

export function withConnectorSourceEndpoint(
  element: ConnectorElement,
  endpoint: ConnectorEndpoint,
  updatedAt: Date = new Date(),
): ConnectorElement {
  assertEndpoint(endpoint, 'source');

  return buildConnectorElement(element, { source: endpoint, updatedAt });
}

export function withConnectorTargetEndpoint(
  element: ConnectorElement,
  endpoint: ConnectorEndpoint,
  updatedAt: Date = new Date(),
): ConnectorElement {
  assertEndpoint(endpoint, 'target');

  return buildConnectorElement(element, { target: endpoint, updatedAt });
}

interface ConnectorElementOverrides {
  readonly source?: ConnectorEndpoint;
  readonly target?: ConnectorEndpoint;
  readonly updatedAt: Date;
}

function buildConnectorElement(
  element: ConnectorElement,
  overrides: ConnectorElementOverrides,
): ConnectorElement {
  const source = overrides.source ?? toConnectorEndpoint(element, 'source');
  const target = overrides.target ?? toConnectorEndpoint(element, 'target');

  const next: ConnectorElement = {
    id: element.id,
    workspaceId: element.workspaceId,
    type: 'connector',
    position: element.position,
    size: element.size,
    rotation: element.rotation,
    zIndex: element.zIndex,
    createdBy: element.createdBy,
    createdAt: element.createdAt,
    updatedAt: overrides.updatedAt,
    ...(source.kind === 'element'
      ? { sourceElementId: source.elementId }
      : { sourcePoint: source.point }),
    ...(target.kind === 'element'
      ? { targetElementId: target.elementId }
      : { targetPoint: target.point }),
  };

  validateConnectorElement(next);

  return next;
}

function toConnectorEndpoint(
  element: ConnectorElement,
  field: 'source' | 'target',
): ConnectorEndpoint {
  const elementId = field === 'source' ? element.sourceElementId : element.targetElementId;
  const point = field === 'source' ? element.sourcePoint : element.targetPoint;

  if (elementId !== undefined) {
    return { kind: 'element', elementId };
  }

  if (point !== undefined) {
    return { kind: 'point', point };
  }

  throw new Error(`ConnectorElement ${field} endpoint is not defined`);
}

function assertEndpoint(endpoint: ConnectorEndpoint, field: 'source' | 'target'): void {
  if (endpoint.kind === 'element') {
    if (!(endpoint.elementId instanceof ElementId)) {
      throw new Error(`ConnectorElement ${field}ElementId must be an ElementId`);
    }
    return;
  }

  if (!(endpoint.point instanceof Position)) {
    throw new Error(`ConnectorElement ${field}Point must be a Position`);
  }
}

function assertElementId(value: ElementId, field: string): void {
  if (!(value instanceof ElementId)) {
    throw new Error(`ConnectorElement ${field} must be an ElementId`);
  }
}
