import {
  computeFloatingPosition,
  FLOATING_GAP,
} from '../../../../../presentation/canvas/text-format/floating-position';

describe('computeFloatingPosition', () => {
  const toolbar = { width: 200, height: 40 };
  const viewport = { width: 1024, height: 768 };

  it('places the toolbar above the anchor when there is room', () => {
    const anchor = { x: 400, y: 300, width: 80, height: 20 };

    const position = computeFloatingPosition(anchor, toolbar, viewport);

    expect(position.placement).toBe('above');
    expect(position.y).toBe(300 - FLOATING_GAP - 40);
    expect(position.x).toBe(400 + 40 - 100);
  });

  it('falls back to placing below when there is no room above', () => {
    const anchor = { x: 400, y: 10, width: 80, height: 20 };

    const position = computeFloatingPosition(anchor, toolbar, viewport);

    expect(position.placement).toBe('below');
    expect(position.y).toBe(10 + 20 + FLOATING_GAP);
  });

  it('clamps x to the viewport edges', () => {
    const anchor = { x: 0, y: 300, width: 20, height: 20 };

    const position = computeFloatingPosition(anchor, toolbar, viewport);

    expect(position.x).toBe(FLOATING_GAP);
  });

  it('clamps x on the right edge when the toolbar would overflow', () => {
    const anchor = { x: 1000, y: 300, width: 20, height: 20 };

    const position = computeFloatingPosition(anchor, toolbar, viewport);

    expect(position.x).toBe(viewport.width - toolbar.width - FLOATING_GAP);
  });

  it('clamps y into the viewport when a tall toolbar would overflow the bottom', () => {
    const tallToolbar = { width: 200, height: 760 };
    const anchor = { x: 400, y: 10, width: 80, height: 20 };

    const position = computeFloatingPosition(anchor, tallToolbar, viewport);

    expect(position.y).toBe(viewport.height - tallToolbar.height);
  });

  it('never produces a negative y', () => {
    const tallToolbar = { width: 200, height: 50 };
    const tinyViewport = { width: 400, height: 50 };
    const anchor = { x: 10, y: 45, width: 20, height: 20 };

    const position = computeFloatingPosition(anchor, tallToolbar, tinyViewport);

    expect(position.y).toBe(0);
  });

  it('accepts a custom gap', () => {
    const anchor = { x: 400, y: 300, width: 80, height: 20 };

    const position = computeFloatingPosition(anchor, toolbar, viewport, 4);

    expect(position.y).toBe(300 - 4 - 40);
  });
});
