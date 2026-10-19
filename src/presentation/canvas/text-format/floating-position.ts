export interface AnchorRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ToolbarDimensions {
  readonly width: number;
  readonly height: number;
}

export interface ViewportDimensions {
  readonly width: number;
  readonly height: number;
}

export type FloatingPlacement = 'above' | 'below';

export interface FloatingPosition {
  readonly x: number;
  readonly y: number;
  readonly placement: FloatingPlacement;
}

export const FLOATING_GAP = 8;

export function computeFloatingPosition(
  anchor: AnchorRect,
  toolbar: ToolbarDimensions,
  viewport: ViewportDimensions,
  gap: number = FLOATING_GAP,
): FloatingPosition {
  const aboveY = anchor.y - gap - toolbar.height;
  const placement: FloatingPlacement = aboveY >= 0 ? 'above' : 'below';

  const xLower = gap;
  const xUpper = Math.max(xLower, viewport.width - toolbar.width - gap);
  const x = clamp(anchor.x + anchor.width / 2 - toolbar.width / 2, xLower, xUpper);

  const rawY = placement === 'above' ? aboveY : anchor.y + anchor.height + gap;
  const yUpper = Math.max(0, viewport.height - toolbar.height);
  const y = clamp(rawY, 0, yUpper);

  return { x, y, placement };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
