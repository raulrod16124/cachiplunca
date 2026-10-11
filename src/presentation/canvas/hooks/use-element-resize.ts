import { useEffect, useRef, useState } from 'react';
import type { Element } from '../../../domain/element';
import { Position } from '../../../domain/shared';
import type { Viewport } from '../../../domain/shared';
import { resizeElementByHandle } from '../../../application/services';
import type { ResizeHandleAnchor } from '../../../application/services';
import { DRAG_SELECTION_THRESHOLD } from './use-drag-selection';

const RESIZE_ANCHORS: readonly ResizeHandleAnchor[] = [
  'top-left',
  'top',
  'top-right',
  'right',
  'bottom-right',
  'bottom',
  'bottom-left',
  'left',
];

export interface UseElementResizeOptions {
  readonly elements: readonly Element[];
  readonly viewport: Viewport;
  readonly selectedIds: readonly string[];
  readonly onResizeElements?: (elements: readonly Element[]) => void;
  readonly spacePressed?: boolean;
  readonly disabled?: boolean;
}

export interface UseElementResizeResult {
  readonly isResizing: boolean;
  readonly ref: React.RefObject<HTMLElement | null>;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest('button, a, input, textarea, select, [role="button"]') !== null;
}

function isResizeAnchor(value: string | undefined): value is ResizeHandleAnchor {
  return value !== undefined && (RESIZE_ANCHORS as readonly string[]).includes(value);
}

function resizeAnchorFromTarget(target: EventTarget | null): ResizeHandleAnchor | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const handle = target.closest('[data-resize-handle]');

  if (!(handle instanceof HTMLElement)) {
    return null;
  }

  const anchor = handle.dataset.resizeAnchor;

  return isResizeAnchor(anchor) ? anchor : null;
}

function toLocalPoint(surface: HTMLElement, event: PointerEvent): Position {
  const bounds = surface.getBoundingClientRect();

  return Position.create(event.clientX - bounds.left, event.clientY - bounds.top);
}

export function useElementResize({
  elements,
  viewport,
  selectedIds,
  onResizeElements,
  spacePressed = false,
  disabled = false,
}: UseElementResizeOptions): UseElementResizeResult {
  const [isResizing, setIsResizing] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const latestRef = useRef({
    elements,
    viewport,
    selectedIds,
    onResizeElements,
    spacePressed,
  });
  latestRef.current = {
    elements,
    viewport,
    selectedIds,
    onResizeElements,
    spacePressed,
  };

  useEffect(() => {
    const element = elementRef.current;
    if (element === null || disabled) {
      return;
    }

    const surface: HTMLElement = element;

    let pointerId: number | null = null;
    let targetId: string | null = null;
    let anchor: ResizeHandleAnchor | null = null;
    let baselineElements: readonly Element[] = [];
    let baselineElement: Element | null = null;
    let startWorld: Position | null = null;
    let startLocal: Position | null = null;
    let isActive = false;

    function reset(): void {
      if (pointerId !== null && surface.hasPointerCapture(pointerId)) {
        surface.releasePointerCapture(pointerId);
      }

      pointerId = null;
      targetId = null;
      anchor = null;
      baselineElements = [];
      baselineElement = null;
      startWorld = null;
      startLocal = null;
      isActive = false;
      setIsResizing(false);
    }

    function handlePointerDown(event: PointerEvent): void {
      if (event.button !== 0 || latestRef.current.spacePressed) {
        return;
      }

      if (isInteractiveTarget(event.target)) {
        return;
      }

      const pressedAnchor = resizeAnchorFromTarget(event.target);

      if (pressedAnchor === null) {
        return;
      }

      const selected = latestRef.current.selectedIds;

      if (selected.length !== 1) {
        return;
      }

      const selectedId = selected[0];

      if (selectedId === undefined) {
        return;
      }

      const element = latestRef.current.elements.find((item) => item.id.value === selectedId);

      if (element === undefined) {
        return;
      }

      const local = toLocalPoint(surface, event);

      surface.setPointerCapture(event.pointerId);
      pointerId = event.pointerId;
      targetId = selectedId;
      anchor = pressedAnchor;
      baselineElements = latestRef.current.elements;
      baselineElement = element;
      startLocal = local;
      startWorld = latestRef.current.viewport.screenToWorld(local);
      isActive = false;
    }

    function handlePointerMove(event: PointerEvent): void {
      if (
        pointerId === null ||
        event.pointerId !== pointerId ||
        startLocal === null ||
        startWorld === null ||
        anchor === null ||
        baselineElement === null ||
        targetId === null
      ) {
        return;
      }

      const current = toLocalPoint(surface, event);

      if (!isActive) {
        const distance = Math.hypot(current.x - startLocal.x, current.y - startLocal.y);

        if (distance < DRAG_SELECTION_THRESHOLD) {
          return;
        }

        isActive = true;
        setIsResizing(true);
      }

      const resizeElements = latestRef.current.onResizeElements;

      if (resizeElements === undefined) {
        return;
      }

      const worldCurrent = latestRef.current.viewport.screenToWorld(current);
      const result = resizeElementByHandle(
        baselineElement,
        anchor,
        worldCurrent.subtract(startWorld),
      );

      if (result.status !== 'ok') {
        return;
      }

      const resized = result.element;
      const next = baselineElements.map((item) => (item.id.value === targetId ? resized : item));

      resizeElements(next);
    }

    function handlePointerUp(event: PointerEvent): void {
      if (pointerId === null || event.pointerId !== pointerId) {
        return;
      }

      reset();
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

  return { isResizing, ref: elementRef };
}
