import {
  connectorSourceEndpoint,
  connectorTargetEndpoint,
  type ConnectorElement,
  type ConnectorEndpoint,
  type Element,
} from '../../domain/element';
import { Bounds, Position } from '../../domain/shared';

export const CONNECTOR_ENDPOINT_GAP = 4;

export interface ConnectorGeometry {
  readonly start: Position;
  readonly end: Position;
}

export function resolveConnectorGeometry(
  connector: ConnectorElement,
  elementsById: ReadonlyMap<string, Element>,
): ConnectorGeometry | null {
  const source = connectorSourceEndpoint(connector);
  const target = connectorTargetEndpoint(connector);

  const sourceElement = resolveEndpointElement(source, elementsById);
  const targetElement = resolveEndpointElement(target, elementsById);

  if (sourceElement === null || targetElement === null) {
    return null;
  }

  const sourceAnchor = endpointAnchor(source, sourceElement, connector.position);
  const targetAnchor = endpointAnchor(target, targetElement, connector.position);
  const sourceBounds =
    sourceElement === undefined ? null : Bounds.of(sourceElement.position, sourceElement.size);
  const targetBounds =
    targetElement === undefined ? null : Bounds.of(targetElement.position, targetElement.size);

  const start =
    sourceBounds === null
      ? sourceAnchor
      : rectangleEdgePoint(sourceBounds, targetAnchor, CONNECTOR_ENDPOINT_GAP);
  const end =
    targetBounds === null
      ? targetAnchor
      : rectangleEdgePoint(targetBounds, sourceAnchor, CONNECTOR_ENDPOINT_GAP);

  return { start, end };
}

export function connectorGeometryBounds(geometry: ConnectorGeometry): Bounds {
  const left = Math.min(geometry.start.x, geometry.end.x);
  const top = Math.min(geometry.start.y, geometry.end.y);
  const right = Math.max(geometry.start.x, geometry.end.x);
  const bottom = Math.max(geometry.start.y, geometry.end.y);

  return Bounds.fromXYWH(left, top, right - left, bottom - top);
}

export function rectangleEdgePoint(bounds: Bounds, toward: Position, gap = 0): Position {
  const center = Position.create(bounds.centerX, bounds.centerY);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;

  if (dx === 0 && dy === 0) {
    return center;
  }

  const halfWidth = bounds.width / 2 + gap;
  const halfHeight = bounds.height / 2 + gap;

  let scale = Number.POSITIVE_INFINITY;

  if (dx !== 0) {
    scale = Math.min(scale, halfWidth / Math.abs(dx));
  }

  if (dy !== 0) {
    scale = Math.min(scale, halfHeight / Math.abs(dy));
  }

  if (!Number.isFinite(scale)) {
    return center;
  }

  return Position.create(center.x + dx * scale, center.y + dy * scale);
}

export function distanceToSegment(point: Position, start: Position, end: Position): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
  );
  const closestX = start.x + t * dx;
  const closestY = start.y + t * dy;

  return Math.hypot(point.x - closestX, point.y - closestY);
}

function resolveEndpointElement(
  endpoint: ConnectorEndpoint,
  elementsById: ReadonlyMap<string, Element>,
): Element | null | undefined {
  if (endpoint.kind === 'point') {
    return undefined;
  }

  return elementsById.get(endpoint.elementId.value) ?? null;
}

function endpointAnchor(
  endpoint: ConnectorEndpoint,
  element: Element | undefined,
  connectorPosition: Position,
): Position {
  if (endpoint.kind === 'point') {
    return endpoint.point.add(connectorPosition);
  }

  if (element === undefined) {
    throw new Error('ConnectorElement endpoint element is not resolved');
  }

  return Position.create(
    element.position.x + element.size.width / 2,
    element.position.y + element.size.height / 2,
  );
}
