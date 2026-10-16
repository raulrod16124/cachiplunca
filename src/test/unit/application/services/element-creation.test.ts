import {
  buildConnectorCreateInput,
  buildElementCreateInput,
  connectorEndpoints,
  defaultElementSize,
  elementContentBounds,
  resolveElementCreatePosition,
} from '../../../../application/services';
import { createTextElement, type Element } from '../../../../domain/element';
import {
  ElementId,
  Position,
  Size,
  Transform,
  UserId,
  Viewport,
  WorkspaceId,
} from '../../../../domain/shared';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');

function createElement(id: string, x: number, y: number, width = 100, height = 40): Element {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(x, y),
    size: Size.create(width, height),
    content: 'hello',
  });
}

describe('defaultElementSize', () => {
  it('exposes a positive size for every creatable element type', () => {
    expect(defaultElementSize('text').width).toBeGreaterThan(0);
    expect(defaultElementSize('note').height).toBeGreaterThan(0);
    expect(defaultElementSize('task').width).toBeGreaterThan(0);
    expect(defaultElementSize('frame').height).toBeGreaterThan(0);
    expect(defaultElementSize('link').height).toBeGreaterThan(0);
  });
});

describe('resolveElementCreatePosition', () => {
  it('centers the element on the viewport center in world coordinates', () => {
    const viewport = Viewport.default(Size.create(800, 600));

    const position = resolveElementCreatePosition(viewport, Size.create(200, 100));

    expect(position.x).toBe(300);
    expect(position.y).toBe(250);
  });

  it('accounts for the current pan and zoom', () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(100, 50), 2),
      Size.create(800, 600),
    );

    const position = resolveElementCreatePosition(viewport, Size.create(100, 100));

    expect(position.x).toBe(250);
    expect(position.y).toBe(150);
  });
});

describe('elementContentBounds', () => {
  it('returns null when there are no elements', () => {
    expect(elementContentBounds([])).toBeNull();
  });

  it('returns the element bounds for a single element', () => {
    const bounds = elementContentBounds([createElement('a', 10, 20, 100, 40)]);

    expect(bounds?.x).toBe(10);
    expect(bounds?.y).toBe(20);
    expect(bounds?.width).toBe(100);
    expect(bounds?.height).toBe(40);
  });

  it('unions every element into a single bounding box', () => {
    const bounds = elementContentBounds([
      createElement('a', 0, 0, 100, 100),
      createElement('b', 200, 150, 100, 50),
    ]);

    expect(bounds?.x).toBe(0);
    expect(bounds?.y).toBe(0);
    expect(bounds?.width).toBe(300);
    expect(bounds?.height).toBe(200);
  });
});

describe('connectorEndpoints', () => {
  it('returns the pair when exactly two ids are selected', () => {
    expect(connectorEndpoints(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('returns null for any other selection size', () => {
    expect(connectorEndpoints([])).toBeNull();
    expect(connectorEndpoints(['a'])).toBeNull();
    expect(connectorEndpoints(['a', 'b', 'c'])).toBeNull();
  });
});

describe('buildElementCreateInput', () => {
  const placement = {
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(10, 10),
    size: Size.create(200, 100),
  };

  it('builds a text input with default content', () => {
    expect(buildElementCreateInput('text', placement)).toEqual({
      ...placement,
      type: 'text',
      content: '',
    });
  });

  it('builds a task input with a todo status and default title', () => {
    expect(buildElementCreateInput('task', placement)).toEqual({
      ...placement,
      type: 'task',
      title: 'New task',
      status: 'todo',
    });
  });

  it('builds a frame input with a default title', () => {
    expect(buildElementCreateInput('frame', placement)).toMatchObject({
      type: 'frame',
      title: 'New frame',
    });
  });

  it('builds a link input with a placeholder url', () => {
    expect(buildElementCreateInput('link', placement)).toMatchObject({
      type: 'link',
      url: 'https://example.com',
    });
  });

  it('builds a note input with empty content', () => {
    expect(buildElementCreateInput('note', placement)).toMatchObject({
      type: 'note',
      content: '',
    });
  });
});

describe('buildConnectorCreateInput', () => {
  it('references the two endpoints with the provided placement', () => {
    const input = buildConnectorCreateInput(
      ElementId.create('source'),
      ElementId.create('target'),
      {
        workspaceId: WORKSPACE_ID,
        createdBy: USER_ID,
        position: Position.create(0, 0),
        size: Size.create(300, 300),
      },
    );

    expect(input.type).toBe('connector');
    if (input.type === 'connector') {
      expect(input.sourceElementId.value).toBe('source');
      expect(input.targetElementId.value).toBe('target');
    }
  });
});
