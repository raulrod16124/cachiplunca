import { Bounds, ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { createConnectorElement, createTextElement } from '../../../../domain/element';
import {
  findSelectableAt,
  findSelectablesInBounds,
  toSelectableItem,
  toSelectableItems,
} from '../../../../application/services/canvas-hit-test';
import type { SelectableItem } from '../../../../application/services/canvas-hit-test';

const FIRST: SelectableItem = { id: 'first', bounds: Bounds.fromXYWH(0, 0, 100, 100) };
const SECOND: SelectableItem = { id: 'second', bounds: Bounds.fromXYWH(50, 50, 100, 100) };

function createElement(id: string, x: number, y: number, width: number, height: number) {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(x, y),
    size: Size.create(width, height),
    content: 'hello',
  });
}

describe('findSelectableAt', () => {
  it('returns null when there are no items', () => {
    expect(findSelectableAt([], Position.create(10, 10))).toBeNull();
  });

  it('returns null when the point is outside every item', () => {
    expect(findSelectableAt([FIRST], Position.create(200, 200))).toBeNull();
  });

  it('returns the id of the item containing the point', () => {
    expect(findSelectableAt([FIRST, SECOND], Position.create(25, 25))).toBe('first');
  });

  it('treats the item edges as hits', () => {
    expect(findSelectableAt([FIRST], Position.create(0, 0))).toBe('first');
    expect(findSelectableAt([FIRST], Position.create(100, 100))).toBe('first');
  });

  it('returns the topmost item when bounds overlap', () => {
    expect(findSelectableAt([FIRST, SECOND], Position.create(75, 75))).toBe('second');
    expect(findSelectableAt([SECOND, FIRST], Position.create(75, 75))).toBe('first');
  });
});

describe('findSelectablesInBounds', () => {
  it('returns an empty list when there are no items', () => {
    expect(findSelectablesInBounds([], Bounds.fromXYWH(0, 0, 10, 10))).toEqual([]);
  });

  it('returns an empty list when no item intersects the rectangle', () => {
    expect(findSelectablesInBounds([FIRST], Bounds.fromXYWH(200, 200, 50, 50))).toEqual([]);
  });

  it('includes items fully contained in the rectangle', () => {
    expect(findSelectablesInBounds([FIRST], Bounds.fromXYWH(-10, -10, 200, 200))).toEqual([
      'first',
    ]);
  });

  it('includes items that only partially intersect the rectangle', () => {
    expect(findSelectablesInBounds([FIRST], Bounds.fromXYWH(50, 50, 20, 20))).toEqual(['first']);
  });

  it('ignores items that only share a border edge with the rectangle', () => {
    expect(findSelectablesInBounds([FIRST], Bounds.fromXYWH(100, 0, 50, 50))).toEqual([]);
  });

  it('returns every intersecting id preserving the input order', () => {
    expect(findSelectablesInBounds([FIRST, SECOND], Bounds.fromXYWH(0, 0, 200, 200))).toEqual([
      'first',
      'second',
    ]);
    expect(findSelectablesInBounds([SECOND, FIRST], Bounds.fromXYWH(0, 0, 200, 200))).toEqual([
      'second',
      'first',
    ]);
  });
});

describe('toSelectableItem', () => {
  it('derives the id and bounds from the element position and size', () => {
    const item = toSelectableItem(createElement('elem-1', 10, 20, 120, 80));

    expect(item.id).toBe('elem-1');
    expect(item.bounds.equals(Bounds.fromXYWH(10, 20, 120, 80))).toBe(true);
  });

  it('maps a list preserving the input order', () => {
    const items = toSelectableItems([
      createElement('first', 0, 0, 100, 100),
      createElement('second', 50, 50, 100, 100),
    ]);

    expect(items.map((item) => item.id)).toEqual(['first', 'second']);
  });

  it('returns an empty list for no elements', () => {
    expect(toSelectableItems([])).toEqual([]);
  });
});

describe('connector segments', () => {
  const CONNECTOR: SelectableItem = {
    id: 'connector',
    bounds: Bounds.fromXYWH(0, 0, 200, 200),
    segment: { start: Position.create(0, 0), end: Position.create(200, 200) },
  };

  it('hits a connector near its stroke', () => {
    expect(findSelectableAt([CONNECTOR], Position.create(100, 104))).toBe('connector');
  });

  it('misses a connector far from its stroke even inside its bounds', () => {
    expect(findSelectableAt([CONNECTOR], Position.create(20, 180))).toBeNull();
  });

  it('prioritizes element boxes over connector segments', () => {
    const box = { id: 'box', bounds: Bounds.fromXYWH(90, 90, 20, 20) };

    expect(findSelectableAt([CONNECTOR, box], Position.create(100, 100))).toBe('box');
    expect(findSelectableAt([box, CONNECTOR], Position.create(100, 100))).toBe('box');
  });

  it('uses connector bounds for marquee selection', () => {
    expect(findSelectablesInBounds([CONNECTOR], Bounds.fromXYWH(90, 90, 20, 20))).toEqual([
      'connector',
    ]);
  });

  it('derives a segment and endpoint handles for free connectors', () => {
    const connector = createConnectorElement({
      id: ElementId.create('free'),
      workspaceId: WorkspaceId.create('ws-1'),
      createdBy: UserId.create('user-1'),
      position: Position.create(100, 100),
      size: Size.create(160, 40),
      sourcePoint: Position.create(0, 20),
      targetPoint: Position.create(160, 20),
    });

    const item = toSelectableItem(connector);

    expect(item.segment?.start.equals(Position.create(100, 120))).toBe(true);
    expect(item.segment?.end.equals(Position.create(260, 120))).toBe(true);
    expect(item.connectorEndpoints?.map((endpoint) => endpoint.side)).toEqual(['source', 'target']);
  });

  it('does not expose endpoint handles for bound connectors', () => {
    const connector = createConnectorElement({
      id: ElementId.create('bound'),
      workspaceId: WorkspaceId.create('ws-1'),
      createdBy: UserId.create('user-1'),
      position: Position.create(0, 0),
      size: Size.create(10, 10),
      sourceElementId: ElementId.create('a'),
      targetElementId: ElementId.create('b'),
    });

    const item = toSelectableItem(connector);

    expect(item.connectorEndpoints).toBeUndefined();
  });
});
