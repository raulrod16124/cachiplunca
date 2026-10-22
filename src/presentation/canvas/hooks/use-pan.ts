import { useEffect, useRef, useState } from 'react';
import { Position } from '../../../domain/shared';
import type { Viewport } from '../../../domain/shared';
import { findSelectableAt } from '../../../application/services';
import type { SelectableItem } from '../../../application/services';
import { DRAG_SELECTION_THRESHOLD } from './use-drag-selection';

const INTERACTIVE_TARGET_SELECTOR =
  'button, a, input, textarea, select, [contenteditable="true"], [role="button"], [data-selectable], [data-resize-handle], [data-rotate-handle], [data-connector-endpoint]';

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest(INTERACTIVE_TARGET_SELECTOR) !== null;
}

export interface UsePanOptions {
  readonly onPan: (delta: Position) => void;
  readonly onEmptyClick?: () => void;
  readonly items?: readonly SelectableItem[];
  readonly viewport?: Viewport;
  readonly spacePressed?: boolean;
  readonly disabled?: boolean;
}

export interface UsePanResult {
  readonly isPanning: boolean;
  readonly ref: React.RefObject<HTMLElement | null>;
}

export function usePan({
  onPan,
  onEmptyClick,
  items,
  viewport,
  spacePressed = false,
  disabled = false,
}: UsePanOptions): UsePanResult {
  const [isPanning, setIsPanning] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const latestRef = useRef({ onPan, onEmptyClick, items, viewport, spacePressed });
  latestRef.current = { onPan, onEmptyClick, items, viewport, spacePressed };

  useEffect(() => {
    const element = elementRef.current;
    if (element === null || disabled) {
      return;
    }

    function createHandlers(canvas: HTMLElement) {
      let pointerId: number | null = null;
      let origin: { readonly x: number; readonly y: number } | null = null;
      let lastPosition: { readonly x: number; readonly y: number } | null = null;
      let isActive = false;
      let isPlainLeft = false;

      function shouldStartPan(event: PointerEvent): boolean {
        if (event.button === 1) {
          return true;
        }

        if (event.button !== 0 || event.shiftKey) {
          return false;
        }

        if (latestRef.current.spacePressed) {
          return true;
        }

        if (isInteractiveTarget(event.target)) {
          return false;
        }

        const { items: selectableItems, viewport: currentViewport } = latestRef.current;

        if (selectableItems === undefined || currentViewport === undefined) {
          return true;
        }

        const rect = canvas.getBoundingClientRect();
        const local = Position.create(event.clientX - rect.left, event.clientY - rect.top);
        const hit = findSelectableAt(selectableItems, currentViewport.screenToWorld(local));

        return hit === null;
      }

      function handlePointerDown(event: PointerEvent): void {
        if (!shouldStartPan(event)) {
          return;
        }

        const plainLeft = event.button === 0 && !latestRef.current.spacePressed;

        canvas.setPointerCapture(event.pointerId);
        pointerId = event.pointerId;
        origin = { x: event.clientX, y: event.clientY };
        lastPosition = origin;
        isPlainLeft = plainLeft;
        isActive = !plainLeft;

        if (isActive) {
          setIsPanning(true);
        }
      }

      function handlePointerMove(event: PointerEvent): void {
        if (pointerId === null || pointerId !== event.pointerId || origin === null) {
          return;
        }

        const current = { x: event.clientX, y: event.clientY };

        if (!isActive) {
          const distance = Math.hypot(current.x - origin.x, current.y - origin.y);

          if (distance < DRAG_SELECTION_THRESHOLD) {
            return;
          }

          isActive = true;
          setIsPanning(true);
        }

        const last = lastPosition ?? origin;
        lastPosition = current;
        latestRef.current.onPan(Position.create(current.x - last.x, current.y - last.y));
      }

      function finishPointer(event: PointerEvent, allowEmptyClick: boolean): void {
        if (pointerId === null || pointerId !== event.pointerId) {
          return;
        }

        const shouldClearSelection =
          allowEmptyClick && isPlainLeft && !isActive && event.type === 'pointerup';

        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }

        pointerId = null;
        origin = null;
        lastPosition = null;
        isActive = false;
        isPlainLeft = false;
        setIsPanning(false);

        if (shouldClearSelection) {
          latestRef.current.onEmptyClick?.();
        }
      }

      function handlePointerUp(event: PointerEvent): void {
        finishPointer(event, true);
      }

      function handlePointerCancel(event: PointerEvent): void {
        finishPointer(event, false);
      }

      function handleWheel(event: WheelEvent): void {
        if (event.ctrlKey || event.metaKey) {
          return;
        }

        event.preventDefault();
        latestRef.current.onPan(Position.create(-event.deltaX, -event.deltaY));
      }

      return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerCancel,
        handleWheel,
      };
    }

    const {
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      handlePointerCancel,
      handleWheel,
    } = createHandlers(element);

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerUp);
    element.addEventListener('pointercancel', handlePointerCancel);
    element.addEventListener('pointerleave', handlePointerCancel);
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerCancel);
      element.removeEventListener('pointerleave', handlePointerCancel);
      element.removeEventListener('wheel', handleWheel);
    };
  }, [disabled]);

  return {
    isPanning,
    ref: elementRef,
  };
}
