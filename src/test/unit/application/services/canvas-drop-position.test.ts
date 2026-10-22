import { resolveDropCreatePosition } from '../../../../application/services';
import { Position, Size, Transform, Viewport } from '../../../../domain/shared';

describe('resolveDropCreatePosition', () => {
  it('centers the element on the drop point in world coordinates', () => {
    const viewport = Viewport.default(Size.create(800, 600));

    const position = resolveDropCreatePosition({
      screenPoint: Position.create(400, 300),
      viewport,
      size: Size.create(320, 200),
    });

    expect(position.x).toBe(240);
    expect(position.y).toBe(200);
  });

  it('accounts for the current pan and zoom', () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(100, 50), 2),
      Size.create(800, 600),
    );

    const position = resolveDropCreatePosition({
      screenPoint: Position.create(200, 100),
      viewport,
      size: Size.create(320, 200),
    });

    expect(position.x).toBe(100);
    expect(position.y).toBe(50);
  });

  it('keeps the element inside the visible viewport near the edges', () => {
    const viewport = Viewport.default(Size.create(800, 600));

    const topLeft = resolveDropCreatePosition({
      screenPoint: Position.create(0, 0),
      viewport,
      size: Size.create(320, 200),
    });
    const bottomRight = resolveDropCreatePosition({
      screenPoint: Position.create(800, 600),
      viewport,
      size: Size.create(320, 200),
    });

    expect(topLeft.x).toBe(0);
    expect(topLeft.y).toBe(0);
    expect(bottomRight.x).toBe(480);
    expect(bottomRight.y).toBe(400);
  });

  it('anchors an element larger than the visible area to its top-left corner', () => {
    const viewport = Viewport.default(Size.create(400, 300));

    const position = resolveDropCreatePosition({
      screenPoint: Position.create(200, 150),
      viewport,
      size: Size.create(800, 600),
    });

    expect(position.x).toBe(0);
    expect(position.y).toBe(0);
  });
});
