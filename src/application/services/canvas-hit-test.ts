import { isConnectorElement, type Element } from '../../domain/element';
import { Bounds } from '../../domain/shared';
import type { Position } from '../../domain/shared';
import {
  connectorGeometryBounds,
  distanceToSegment,
  type ConnectorGeometry,
} from './connector-geometry';

export const CONNECTOR_HIT_TOLERANCE = 6;

export interface SelectableSegment {
  readonly start: Position;
  readonly end: Position;
}

export interface ConnectorEndpointHandle {
  readonly side: 'source' | 'target';
  readonly position: Position;
}

export interface SelectableItem {
  readonly id: string;
  readonly bounds: Bounds;
  readonly segment?: SelectableSegment;
  readonly connectorEndpoints?: readonly ConnectorEndpointHandle[];
}

export function toSelectableItem(element: Element, geometry?: ConnectorGeometry): SelectableItem {
  if (isConnectorElement(element)) {
    const endpoints =
      element.sourcePoint !== undefined && element.targetPoint !== undefined
        ? [
            {
              side: 'source' as const,
              position: element.position.add(element.sourcePoint),
            },
            {
              side: 'target' as const,
              position: element.position.add(element.targetPoint),
            },
          ]
        : undefined;
    const resolvedGeometry =
      geometry ??
      (endpoints === undefined
        ? undefined
        : { start: endpoints[0].position, end: endpoints[1].position });
    const bounds =
      resolvedGeometry === undefined
        ? Bounds.fromXYWH(
            element.position.x,
            element.position.y,
            element.size.width,
            element.size.height,
          )
        : connectorGeometryBounds(resolvedGeometry);

    return {
      id: element.id.value,
      bounds,
      ...(resolvedGeometry === undefined ? {} : { segment: resolvedGeometry }),
      ...(endpoints === undefined ? {} : { connectorEndpoints: endpoints }),
    };
  }

  return {
    id: element.id.value,
    bounds: Bounds.fromXYWH(
      element.position.x,
      element.position.y,
      element.size.width,
      element.size.height,
    ),
  };
}

export function toSelectableItems(
  elements: readonly Element[],
  connectorGeometries?: ReadonlyMap<string, ConnectorGeometry>,
): readonly SelectableItem[] {
  return elements.map((element) =>
    toSelectableItem(element, connectorGeometries?.get(element.id.value)),
  );
}

export function findSelectableAt(
  items: readonly SelectableItem[],
  worldPoint: Position,
  connectorTolerance = CONNECTOR_HIT_TOLERANCE,
): string | null {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item !== undefined && item.segment === undefined && item.bounds.contains(worldPoint)) {
      return item.id;
    }
  }

  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item?.segment === undefined) {
      continue;
    }

    if (distanceToSegment(worldPoint, item.segment.start, item.segment.end) <= connectorTolerance) {
      return item.id;
    }
  }

  return null;
}

export function findSelectablesInBounds(
  items: readonly SelectableItem[],
  worldBounds: Bounds,
): readonly string[] {
  const matches: string[] = [];

  for (const item of items) {
    if (item.bounds.intersects(worldBounds)) {
      matches.push(item.id);
    }
  }

  return matches;
}
