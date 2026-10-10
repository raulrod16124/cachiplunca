import { ElementId } from '../shared/value-objects/element-id';
import { Position } from '../shared/value-objects/position';
import { Size } from '../shared/value-objects/size';
import { UserId } from '../shared/value-objects/user-id';
import { WorkspaceId } from '../shared/value-objects/workspace-id';
import { validateConnectorElement } from './element-types';
import type { ConnectorElement } from './element-types';

export interface CreateConnectorElementProps {
  readonly id: ElementId;
  readonly workspaceId: WorkspaceId;
  readonly createdBy: UserId;
  readonly position: Position;
  readonly size: Size;
  readonly sourceElementId: ElementId;
  readonly targetElementId: ElementId;
  readonly rotation?: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export function createConnectorElement(props: CreateConnectorElementProps): ConnectorElement {
  assertElementId(props.sourceElementId, 'sourceElementId');
  assertElementId(props.targetElementId, 'targetElementId');
  assertDistinctEndpoints(props.sourceElementId, props.targetElementId);

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
    createdBy: props.createdBy,
    createdAt,
    updatedAt,
    sourceElementId: props.sourceElementId,
    targetElementId: props.targetElementId,
  };

  validateConnectorElement(element);

  return element;
}

export function withConnectorSource(
  element: ConnectorElement,
  sourceElementId: ElementId,
  updatedAt: Date = new Date(),
): ConnectorElement {
  assertElementId(sourceElementId, 'sourceElementId');
  assertDistinctEndpoints(sourceElementId, element.targetElementId);

  return buildConnectorElement(element, { sourceElementId, updatedAt });
}

export function withConnectorTarget(
  element: ConnectorElement,
  targetElementId: ElementId,
  updatedAt: Date = new Date(),
): ConnectorElement {
  assertElementId(targetElementId, 'targetElementId');
  assertDistinctEndpoints(element.sourceElementId, targetElementId);

  return buildConnectorElement(element, { targetElementId, updatedAt });
}

interface ConnectorElementOverrides {
  readonly sourceElementId?: ElementId;
  readonly targetElementId?: ElementId;
  readonly updatedAt: Date;
}

function buildConnectorElement(
  element: ConnectorElement,
  overrides: ConnectorElementOverrides,
): ConnectorElement {
  const next: ConnectorElement = {
    id: element.id,
    workspaceId: element.workspaceId,
    type: 'connector',
    position: element.position,
    size: element.size,
    rotation: element.rotation,
    createdBy: element.createdBy,
    createdAt: element.createdAt,
    updatedAt: overrides.updatedAt,
    sourceElementId: overrides.sourceElementId ?? element.sourceElementId,
    targetElementId: overrides.targetElementId ?? element.targetElementId,
  };

  validateConnectorElement(next);

  return next;
}

function assertElementId(value: ElementId, field: string): void {
  if (!(value instanceof ElementId)) {
    throw new Error(`ConnectorElement ${field} must be an ElementId`);
  }
}

function assertDistinctEndpoints(sourceElementId: ElementId, targetElementId: ElementId): void {
  if (sourceElementId.equals(targetElementId)) {
    throw new Error('ConnectorElement source and target cannot be the same');
  }
}
