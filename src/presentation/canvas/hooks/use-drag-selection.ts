import { useEffect, useRef, useState } from 'react';
import { Bounds, Position } from '../../../domain/shared';
import type { Viewport } from '../../../domain/shared';
import { findSelectableAt, findSelectablesInBounds } from '../../../application/services';
import type { SelectableItem } from '../../../application/services';

export const DRAG_SELECTION_THRESHOLD = 4;

export interface DragSelectionRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface UseDragSelectionOptions {
  readonly items: readonly SelectableItem[];
  readonly viewport: Viewport;
  readonly onSelect: (ids: readonly string[], additive: boolean) => void;
  readonly onClear: () => void;
  readonly spacePressed?: boolean;
  readonly disabled?: boolean;
}

export interface UseDragSelectionResult {
  readonly rect: DragSelectionRect | null;
  readonly ref: React.RefObject<HTMLElement | null>;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return (
    target.closest('button, a, input, textarea, select, [role="button"], [data-selectable]') !==
    null
  );
}

function toLocalPoint(surface: HTMLElement, event: PointerEvent): Position {
  const bounds = surface.getBoundingClientRect();

  return Position.create(event.clientX - bounds.left, event.clientY - bounds.top);
}

function toRect(origin: Position, current: Position): DragSelectionRect {
  return {
    x: Math.min(origin.x, current.x),
    y: Math.min(origin.y, current.y),
    width: Math.abs(current.x - origin.x),
    height: Math.abs(current.y - origin.y),
  };
}

export function useDragSelection({
  items,
  viewport,
  onSelect,
  onClear,
  spacePressed = false,
  disabled = false,
}: UseDragSelectionOptions): UseDragSelectionResult {
  const [rect, setRect] = useState<DragSelectionRect | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const latestRef = useRef({ items, viewport, onSelect, onClear, spacePressed });
  latestRef.current = { items, viewport, onSelect, onClear, spacePressed };

  useEffect(() => {
    const element = elementRef.current;
    if (element === null || disabled) {
      return;
    }

    const surface: HTMLElement = element;

    let pointerId: number | null = null;
    let origin: Position | null = null;
    let additive = false;
    let isActive = false;

    function reset(): void {
      if (pointerId !== null && surface.hasPointerCapture(pointerId)) {
        surface.releasePointerCapture(pointerId);
      }

      pointerId = null;
      origin = null;
      additive = false;
      isActive = false;
      setRect(null);
    }

    function handlePointerDown(event: PointerEvent): void {
      if (event.button !== 0 || latestRef.current.spacePressed) {
        return;
      }

      if (isInteractiveTarget(event.target)) {
        return;
      }

      const local = toLocalPoint(surface, event);
      const worldPoint = latestRef.current.viewport.screenToWorld(local);

      if (findSelectableAt(latestRef.current.items, worldPoint) !== null) {
        return;
      }

      surface.setPointerCapture(event.pointerId);
      pointerId = event.pointerId;
      origin = local;
      additive = event.shiftKey || event.metaKey || event.ctrlKey;
      isActive = false;
    }

    function handlePointerMove(event: PointerEvent): void {
      if (pointerId === null || event.pointerId !== pointerId || origin === null) {
        return;
      }

      const current = toLocalPoint(surface, event);

      if (!isActive) {
        const distance = Math.hypot(current.x - origin.x, current.y - origin.y);
        if (distance < DRAG_SELECTION_THRESHOLD) {
          return;
        }

        isActive = true;
      }

      setRect(toRect(origin, current));
    }

    function handlePointerUp(event: PointerEvent): void {
      if (pointerId === null || event.pointerId !== pointerId || origin === null) {
        return;
      }

      const pointerOrigin = origin;
      const committedAdditive = additive;
      const wasActive = isActive;
      const current = toLocalPoint(surface, event);

      reset();

      if (!wasActive) {
        latestRef.current.onClear();
        return;
      }

      const worldOrigin = latestRef.current.viewport.screenToWorld(pointerOrigin);
      const worldCurrent = latestRef.current.viewport.screenToWorld(current);
      const left = Math.min(worldOrigin.x, worldCurrent.x);
      const top = Math.min(worldOrigin.y, worldCurrent.y);
      const worldBounds = Bounds.fromXYWH(
        left,
        top,
        Math.abs(worldCurrent.x - worldOrigin.x),
        Math.abs(worldCurrent.y - worldOrigin.y),
      );
      const ids = findSelectablesInBounds(latestRef.current.items, worldBounds);

      latestRef.current.onSelect(ids, committedAdditive);
    }

    function handlePointerCancel(event: PointerEvent): void {
      if (pointerId === null || event.pointerId !== pointerId) {
        return;
      }

      reset();
    }

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerUp);
    element.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [disabled]);

  return { rect, ref: elementRef };
}
