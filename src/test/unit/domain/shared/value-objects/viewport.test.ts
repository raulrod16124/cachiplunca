import { Position, Size, Transform, Viewport } from '../../../../../domain/shared';

describe('Viewport', () => {
  it('creates a viewport from transform and size', () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(10, 20), 2),
      Size.create(800, 600),
    );

    expect(viewport.transform.x).toBe(10);
    expect(viewport.transform.y).toBe(20);
    expect(viewport.scale).toBe(2);
    expect(viewport.size.width).toBe(800);
    expect(viewport.size.height).toBe(600);
  });

  it('creates with of() factory method', () => {
    const viewport = Viewport.of(Transform.identity(), Size.create(100, 100));

    expect(viewport.transform).toEqual(Transform.identity());
    expect(viewport.size).toEqual(Size.create(100, 100));
  });

  it('creates a default viewport with identity transform', () => {
    const viewport = Viewport.default(Size.create(800, 600));

    expect(viewport.transform).toEqual(Transform.identity());
    expect(viewport.size).toEqual(Size.create(800, 600));
  });

  it('converts world to screen with translation only', () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(100, 50), 1),
      Size.create(800, 600),
    );

    expect(viewport.worldToScreen(Position.create(150, 100))).toEqual(Position.create(50, 50));
  });

  it('converts world to screen with scale only', () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(0, 0), 2),
      Size.create(800, 600),
    );

    expect(viewport.worldToScreen(Position.create(100, 50))).toEqual(Position.create(200, 100));
  });

  it('converts world to screen with translation and scale', () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(100, 100), 2),
      Size.create(800, 600),
    );

    expect(viewport.worldToScreen(Position.create(150, 125))).toEqual(Position.create(100, 50));
  });

  it('converts screen to world with translation only', () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(100, 50), 1),
      Size.create(800, 600),
    );

    expect(viewport.screenToWorld(Position.create(50, 50))).toEqual(Position.create(150, 100));
  });

  it('converts screen to world with scale only', () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(0, 0), 2),
      Size.create(800, 600),
    );

    expect(viewport.screenToWorld(Position.create(200, 100))).toEqual(Position.create(100, 50));
  });

  it('converts screen to world with translation and scale', () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(100, 100), 2),
      Size.create(800, 600),
    );

    expect(viewport.screenToWorld(Position.create(100, 50))).toEqual(Position.create(150, 125));
  });

  it('maps world origin through an identity transform', () => {
    const viewport = Viewport.default(Size.create(800, 600));

    expect(viewport.worldToScreen(Position.create(0, 0))).toEqual(Position.create(0, 0));
  });

  it('maps screen origin through an identity transform', () => {
    const viewport = Viewport.default(Size.create(800, 600));

    expect(viewport.screenToWorld(Position.create(0, 0))).toEqual(Position.create(0, 0));
  });

  it('pans the camera by the inverted screen delta', () => {
    const viewport = Viewport.default(Size.create(800, 600));
    const panned = viewport.pan(Position.create(50, 30));

    expect(panned.transform.translation).toEqual(Position.create(-50, -30));
    expect(panned.scale).toBe(1);
  });

  it('scales the pan delta by the inverse of the zoom', () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(0, 0), 2),
      Size.create(800, 600),
    );
    const panned = viewport.pan(Position.create(100, 40));

    expect(panned.transform.translation).toEqual(Position.create(-50, -20));
  });

  it('does not mutate the original viewport when panning', () => {
    const viewport = Viewport.default(Size.create(800, 600));
    viewport.pan(Position.create(10, 10));

    expect(viewport.transform.translation).toEqual(Position.create(0, 0));
  });

  it('preserves viewport size when panning', () => {
    const viewport = Viewport.default(Size.create(1024, 768));
    const panned = viewport.pan(Position.create(20, 20));

    expect(panned.size).toEqual(Size.create(1024, 768));
  });

  it('throws when pan delta is not finite', () => {
    const viewport = Viewport.default(Size.create(800, 600));

    expect(() => viewport.pan(Position.create(NaN, 0))).toThrow();
  });

  it('round-trips world to screen and back', () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(-50, 75), 1.5),
      Size.create(800, 600),
    );
    const world = Position.create(123, -456);
    const screen = viewport.worldToScreen(world);
    const roundTrip = viewport.screenToWorld(screen);

    expect(roundTrip.x).toBeCloseTo(world.x);
    expect(roundTrip.y).toBeCloseTo(world.y);
  });

  it('round-trips screen to world and back', () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(100, -100), 0.75),
      Size.create(800, 600),
    );
    const screen = Position.create(400, 300);
    const world = viewport.screenToWorld(screen);
    const roundTrip = viewport.worldToScreen(world);

    expect(roundTrip.x).toBeCloseTo(screen.x);
    expect(roundTrip.y).toBeCloseTo(screen.y);
  });

  it('round-trips fractional coordinates at a small scale', () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(-12.5, 34.25), 0.125),
      Size.create(800, 600),
    );
    const world = Position.create(123.456, -789.012);
    const screen = viewport.worldToScreen(world);
    const roundTrip = viewport.screenToWorld(screen);

    expect(roundTrip.x).toBeCloseTo(world.x, 10);
    expect(roundTrip.y).toBeCloseTo(world.y, 10);
  });

  it('round-trips large coordinates', () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(100000, -200000), 4),
      Size.create(800, 600),
    );
    const world = Position.create(500000, -800000);
    const screen = viewport.worldToScreen(world);
    const roundTrip = viewport.screenToWorld(screen);

    expect(roundTrip.x).toBeCloseTo(world.x);
    expect(roundTrip.y).toBeCloseTo(world.y);
  });

  it('compares equality correctly', () => {
    const a = Viewport.default(Size.create(800, 600));
    const b = Viewport.default(Size.create(800, 600));
    const c = Viewport.create(Transform.create(Position.create(10, 0), 1), Size.create(800, 600));
    const d = Viewport.default(Size.create(1024, 768));

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
    expect(a.equals(d)).toBe(false);
  });

  it('converts to string', () => {
    const viewport = Viewport.default(Size.create(800, 600));

    expect(viewport.toString()).toBe(
      'Viewport(Transform(Position(0, 0), scale=1), Size(800, 600))',
    );
  });

  it('serializes to JSON', () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(10, 20), 2),
      Size.create(800, 600),
    );

    expect(viewport.toJSON()).toEqual({
      transform: { x: 10, y: 20, scale: 2 },
      width: 800,
      height: 600,
    });
  });

  describe('zoom', () => {
    it('increases scale when factor is greater than 1', () => {
      const viewport = Viewport.default(Size.create(800, 600));
      const zoomed = viewport.zoom(2, Position.create(0, 0));

      expect(zoomed.scale).toBe(2);
    });

    it('decreases scale when factor is between 0 and 1', () => {
      const viewport = Viewport.create(
        Transform.create(Position.create(0, 0), 2),
        Size.create(800, 600),
      );
      const zoomed = viewport.zoom(0.5, Position.create(0, 0));

      expect(zoomed.scale).toBe(1);
    });

    it('keeps the anchor point stable on screen after zooming in', () => {
      const viewport = Viewport.default(Size.create(800, 600));
      const anchor = Position.create(200, 150);
      const zoomed = viewport.zoom(2, anchor);

      const screenAnchorAfterZoom = zoomed.worldToScreen(viewport.screenToWorld(anchor));
      expect(screenAnchorAfterZoom.x).toBeCloseTo(anchor.x);
      expect(screenAnchorAfterZoom.y).toBeCloseTo(anchor.y);
    });

    it('keeps the anchor point stable on screen after zooming out', () => {
      const viewport = Viewport.create(
        Transform.create(Position.create(0, 0), 2),
        Size.create(800, 600),
      );
      const anchor = Position.create(400, 300);
      const zoomed = viewport.zoom(0.5, anchor);

      const screenAnchorAfterZoom = zoomed.worldToScreen(viewport.screenToWorld(anchor));
      expect(screenAnchorAfterZoom.x).toBeCloseTo(anchor.x);
      expect(screenAnchorAfterZoom.y).toBeCloseTo(anchor.y);
    });

    it('preserves viewport size', () => {
      const viewport = Viewport.default(Size.create(1024, 768));
      const zoomed = viewport.zoom(2, Position.create(100, 100));

      expect(zoomed.size).toEqual(Size.create(1024, 768));
    });

    it('does not mutate the original viewport', () => {
      const viewport = Viewport.default(Size.create(800, 600));
      viewport.zoom(2, Position.create(100, 100));

      expect(viewport.scale).toBe(1);
      expect(viewport.transform.translation).toEqual(Position.create(0, 0));
    });

    it('throws when zoom factor is zero', () => {
      const viewport = Viewport.default(Size.create(800, 600));

      expect(() => viewport.zoom(0, Position.create(100, 100))).toThrow(
        'Zoom factor must be greater than zero',
      );
    });

    it('throws when zoom factor is negative', () => {
      const viewport = Viewport.default(Size.create(800, 600));

      expect(() => viewport.zoom(-1, Position.create(100, 100))).toThrow(
        'Zoom factor must be greater than zero',
      );
    });

    it('throws when zoom factor is not finite', () => {
      const viewport = Viewport.default(Size.create(800, 600));

      expect(() => viewport.zoom(NaN, Position.create(100, 100))).toThrow(
        'Zoom factor must be a finite number',
      );
    });
  });
});
