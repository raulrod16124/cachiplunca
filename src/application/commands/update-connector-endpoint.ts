import {
  createConnectorElement,
  isConnectorElement,
  type ConnectorElement,
} from '../../domain/element';
import { Position, Size } from '../../domain/shared';
import type { AppError } from '../../shared/errors';
import { toValidationAppError } from './to-validation-app-error';

export type ConnectorEndpointSide = 'source' | 'target';

export interface UpdateConnectorEndpointInput {
  readonly element: ConnectorElement;
  readonly side: ConnectorEndpointSide;
  readonly point: Position;
}

export interface UpdateConnectorEndpointDeps {
  readonly now?: () => Date;
}

export type UpdateConnectorEndpointResult =
  | { readonly status: 'ok'; readonly element: ConnectorElement }
  | { readonly status: 'error'; readonly error: AppError };

export type UpdateConnectorEndpoint = (
  input: UpdateConnectorEndpointInput,
) => UpdateConnectorEndpointResult;

export function createUpdateConnectorEndpoint(
  deps: UpdateConnectorEndpointDeps = {},
): UpdateConnectorEndpoint {
  return (input: UpdateConnectorEndpointInput): UpdateConnectorEndpointResult => {
    try {
      return { status: 'ok', element: moveFreeEndpoint(input, deps) };
    } catch (error) {
      return { status: 'error', error: toValidationAppError(error) };
    }
  };
}

function moveFreeEndpoint(
  input: UpdateConnectorEndpointInput,
  deps: UpdateConnectorEndpointDeps,
): ConnectorElement {
  const { element, side, point } = input;

  if (!isConnectorElement(element)) {
    throw new Error('Only connector elements can move connector endpoints');
  }

  if (element.sourcePoint === undefined || element.targetPoint === undefined) {
    throw new Error('Only free connectors can move their endpoints directly');
  }

  const sourceWorld = side === 'source' ? point : element.position.add(element.sourcePoint);
  const targetWorld = side === 'target' ? point : element.position.add(element.targetPoint);

  if (sourceWorld.equals(targetWorld)) {
    throw new Error('ConnectorElement source and target cannot be the same point');
  }

  const left = Math.min(sourceWorld.x, targetWorld.x);
  const top = Math.min(sourceWorld.y, targetWorld.y);
  const width = Math.max(Math.abs(targetWorld.x - sourceWorld.x), 1);
  const height = Math.max(Math.abs(targetWorld.y - sourceWorld.y), 1);
  const position = Position.create(left, top);
  const updatedAt = deps.now === undefined ? new Date() : deps.now();

  return createConnectorElement({
    id: element.id,
    workspaceId: element.workspaceId,
    createdBy: element.createdBy,
    position,
    size: Size.create(width, height),
    rotation: element.rotation,
    zIndex: element.zIndex,
    createdAt: element.createdAt,
    updatedAt,
    sourcePoint: sourceWorld.subtract(position),
    targetPoint: targetWorld.subtract(position),
  });
}
