import {
  connectorGeometryBounds,
  distanceToSegment,
  rectangleEdgePoint,
  resolveConnectorGeometry,
} from '../../../../application/services';
import {
  createConnectorElement,
  createTextElement,
  type Element,
} from '../../../../domain/element';
import { Bounds, ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');

function createNode(id: string, x: number, y: number, width = 120, height = 80): Element {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(x, y),
    size: Size.create(width, height),
    content: id,
  });
}

function createBoundConnector(source: string, target: string, zIndex = 0) {
  return createConnectorElement({
    id: ElementId.create(`connector-${source}-${target}`),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(0, 0),
    size: Size.create(0, 0),
    zIndex,
    sourceElementId: ElementId.create(source),
    targetElementId: ElementId.create(target),
  });
}

function createFreeConnector(position: Position, source: Position, target: Position) {
  return createConnectorElement({
    id: ElementId.create('free-1'),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position,
    size: Size.create(160, 40),
    sourcePoint: source,
    targetPoint: target,
  });
}

function toMap(elements: readonly Element[]): ReadonlyMap<string, Element> {
  return new Map(elements.map((element) => [element.id.value, element]));
}

describe('resolveConnectorGeometry', () => {
  it('anchors both endpoints to the element borders with a gap', () => {
    const source = createNode('source', 30, 40);
    const target = createNode('target', 200, 200);
    const connector = createBoundConnector('source', 'target');
    const elements = toMap([source, target]);

    const geometry = resolveConnectorGeometry(connector, elements);

    expect(geometry).not.toBeNull();
    expect(geometry?.start.x).toBeCloseTo(136.75);
    expect(geometry?.start.y).toBeCloseTo(124);
    expect(geometry?.end.x).toBeCloseTo(213.25);
    expect(geometry?.end.y).toBeCloseTo(196);
  });

  it('resolves free endpoints from local points and the connector position', () => {
    const connector = createFreeConnector(
      Position.create(100, 100),
      Position.create(0, 20),
      Position.create(160, 20),
    );

    const geometry = resolveConnectorGeometry(connector, new Map());

    expect(geometry?.start.equals(Position.create(100, 120))).toBe(true);
    expect(geometry?.end.equals(Position.create(260, 120))).toBe(true);
  });

  it('supports one bound endpoint and one free endpoint', () => {
    const source = createNode('source', 0, 0);
    const connector = createConnectorElement({
      id: ElementId.create('mixed'),
      workspaceId: WORKSPACE_ID,
      createdBy: USER_ID,
      position: Position.create(200, 100),
      size: Size.create(100, 20),
      sourceElementId: ElementId.create('source'),
      targetPoint: Position.create(60, 10),
    });

    const geometry = resolveConnectorGeometry(connector, toMap([source]));

    expect(geometry?.end.equals(Position.create(260, 110))).toBe(true);
    expect(geometry?.start.x).toBeGreaterThan(source.position.x + source.size.width);
  });

  it('returns null when a referenced element is missing', () => {
    const connector = createBoundConnector('source', 'target');

    expect(resolveConnectorGeometry(connector, new Map())).toBeNull();
  });

  it('keeps connectors pointing to the same center stable', () => {
    const source = createNode('source', 0, 0, 100, 100);
    const target = createNode('target', 0, 0, 100, 100);
    const connector = createBoundConnector('source', 'target');

    const geometry = resolveConnectorGeometry(connector, toMap([source, target]));

    expect(geometry?.start.equals(Position.create(50, 50))).toBe(true);
    expect(geometry?.end.equals(Position.create(50, 50))).toBe(true);
  });
});

describe('rectangleEdgePoint', () => {
  it('intersects a ray with the right edge', () => {
    const point = rectangleEdgePoint(Bounds.fromXYWH(0, 0, 100, 100), Position.create(200, 50));

    expect(point.equals(Position.create(100, 50))).toBe(true);
  });

  it('adds the gap outside the rectangle', () => {
    const point = rectangleEdgePoint(Bounds.fromXYWH(0, 0, 100, 100), Position.create(200, 50), 10);

    expect(point.equals(Position.create(110, 50))).toBe(true);
  });

  it('returns the center when the target is the center', () => {
    const point = rectangleEdgePoint(Bounds.fromXYWH(0, 0, 100, 100), Position.create(50, 50));

    expect(point.equals(Position.create(50, 50))).toBe(true);
  });
});

describe('connectorGeometryBounds', () => {
  it('returns the bounding box of both endpoints', () => {
    const bounds = connectorGeometryBounds({
      start: Position.create(30, 40),
      end: Position.create(10, 100),
    });

    expect(bounds.equals(Bounds.fromXYWH(10, 40, 20, 60))).toBe(true);
  });
});

describe('distanceToSegment', () => {
  it('measures the perpendicular distance to the line', () => {
    const distance = distanceToSegment(
      Position.create(5, 5),
      Position.create(0, 0),
      Position.create(10, 0),
    );

    expect(distance).toBe(5);
  });

  it('clamps to the nearest endpoint', () => {
    const distance = distanceToSegment(
      Position.create(15, 0),
      Position.create(0, 0),
      Position.create(10, 0),
    );

    expect(distance).toBe(5);
  });

  it('falls back to point distance for degenerate segments', () => {
    const distance = distanceToSegment(
      Position.create(3, 4),
      Position.create(0, 0),
      Position.create(0, 0),
    );

    expect(distance).toBe(5);
  });
});
