import { createUpdateConnectorEndpoint } from '../../../../application/commands';
import { createConnectorElement, createTextElement } from '../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');
const NOW = new Date('2024-02-01T00:00:00Z');

function createFreeConnector() {
  return createConnectorElement({
    id: ElementId.create('free-1'),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(100, 100),
    size: Size.create(160, 40),
    sourcePoint: Position.create(0, 20),
    targetPoint: Position.create(160, 20),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  });
}

describe('createUpdateConnectorEndpoint', () => {
  const update = createUpdateConnectorEndpoint({ now: () => NOW });

  it('moves a free endpoint and recomputes the bounding box', () => {
    const result = update({
      element: createFreeConnector(),
      side: 'target',
      point: Position.create(200, 160),
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(result.element.position.equals(Position.create(100, 120))).toBe(true);
    expect(result.element.size.equals(Size.create(100, 40))).toBe(true);
    expect(result.element.sourcePoint?.equals(Position.create(0, 0))).toBe(true);
    expect(result.element.targetPoint?.equals(Position.create(100, 40))).toBe(true);
    expect(result.element.updatedAt).toBe(NOW);
  });

  it('moves the source endpoint without mutating the original', () => {
    const original = createFreeConnector();
    const result = update({
      element: original,
      side: 'source',
      point: Position.create(140, 80),
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }

    expect(result.element.position.equals(Position.create(140, 80))).toBe(true);
    expect(result.element.sourcePoint?.equals(Position.create(0, 0))).toBe(true);
    expect(result.element.targetPoint?.equals(Position.create(120, 40))).toBe(true);
    expect(original.position.equals(Position.create(100, 100))).toBe(true);
  });

  it('rejects attached connectors', () => {
    const bound = createConnectorElement({
      id: ElementId.create('bound-1'),
      workspaceId: WORKSPACE_ID,
      createdBy: USER_ID,
      position: Position.create(0, 0),
      size: Size.create(10, 10),
      sourceElementId: ElementId.create('a'),
      targetElementId: ElementId.create('b'),
    });

    const result = update({
      element: bound,
      side: 'source',
      point: Position.create(50, 50),
    });

    expect(result.status).toBe('error');
  });

  it('rejects non-connector elements', () => {
    const text = createTextElement({
      id: ElementId.create('text-1'),
      workspaceId: WORKSPACE_ID,
      createdBy: USER_ID,
      position: Position.create(0, 0),
      size: Size.create(10, 10),
      content: 'hello',
    });

    const result = update({
      element: text as never,
      side: 'source',
      point: Position.create(50, 50),
    });

    expect(result.status).toBe('error');
  });

  it('rejects coincident endpoints', () => {
    const result = update({
      element: createFreeConnector(),
      side: 'target',
      point: Position.create(100, 120),
    });

    expect(result.status).toBe('error');
  });
});
