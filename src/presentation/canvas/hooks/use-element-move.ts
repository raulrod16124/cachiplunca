import { useEffect, useRef, useState } from 'react';
import { isConnectorElement } from '../../../domain/element';
import type { Element } from '../../../domain/element';
import { Position } from '../../../domain/shared';
import type { Viewport } from '../../../domain/shared';
import { moveElementsByDelta, resolveMoveIds } from '../../../application/services';
import { DRAG_SELECTION_THRESHOLD } from './use-drag-selection';

export interface UseElementMoveOptions {
  readonly elements: readonly Element[];
  readonly viewport: Viewport;
  readonly selectedIds: readonly string[];
  readonly onMoveElements?: (elements: readonly Element[]) => void;
  readonly onSelectOnly?: (id: string) => void;
  readonly onTransformEnd?: () => void;
  readonly spacePressed?: boolean;
  readonly disabled?: boolean;
}

export interface UseElementMoveResult {
  readonly isMoving: boolean;
  readonly ref: React.RefObject<HTMLElement | null>;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return (
    target.closest(
      'button, a, input, textarea, select, [contenteditable="true"], [role="button"]',
    ) !== null
  );
}

function selectableIdFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const selectable = target.closest('[data-selectable]');

  if (!(selectable instanceof HTMLElement)) {
    return null;
  }

  return selectable.dataset.elementId ?? null;
}

function toLocalPoint(surface: HTMLElement, event: PointerEvent): Position {
  const bounds = surface.getBoundingClientRect();

  return Position.create(event.clientX - bounds.left, event.clientY - bounds.top);
}

export function useElementMove({
  elements,
  viewport,
  selectedIds,
  onMoveElements,
  onSelectOnly,
  onTransformEnd,
  spacePressed = false,
  disabled = false,
}: UseElementMoveOptions): UseElementMoveResult {
  const [isMoving, setIsMoving] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const latestRef = useRef({
    elements,
    viewport,
    selectedIds,
    onMoveElements,
    onSelectOnly,
    onTransformEnd,
    spacePressed,
  });
  latestRef.current = {
    elements,
    viewport,
    selectedIds,
    onMoveElements,
    onSelectOnly,
    onTransformEnd,
    spacePressed,
  };

  useEffect(() => {
    const element = elementRef.current;
    if (element === null || disabled) {
      return;
    }

    const surface: HTMLElement = element;

    let pointerId: number | null = null;
    let hitId: string | null = null;
    let idsToMove: readonly string[] = [];
    let baseline: readonly Element[] = [];
    let startLocal: Position | null = null;
    let startWorld: Position | null = null;
    let isActive = false;

    function reset(): void {
      if (pointerId !== null && surface.hasPointerCapture(pointerId)) {
        surface.releasePointerCapture(pointerId);
      }

      pointerId = null;
      hitId = null;
      idsToMove = [];
      baseline = [];
      startLocal = null;
      startWorld = null;
      isActive = false;
      setIsMoving(false);
    }

    function handlePointerDown(event: PointerEvent): void {
      if (event.button !== 0 || latestRef.current.spacePressed) {
        return;
      }

      if (isInteractiveTarget(event.target)) {
        return;
      }

      const id = selectableIdFromTarget(event.target);

      if (id === null) {
        return;
      }

      if (event.shiftKey || event.metaKey || event.ctrlKey) {
        return;
      }

      const local = toLocalPoint(surface, event);
      const nextIdsToMove = resolveMoveIds(id, latestRef.current.selectedIds).filter(
        (candidateId) => {
          const candidate = latestRef.current.elements.find(
            (element) => element.id.value === candidateId,
          );

          return !(
            candidate !== undefined &&
            isConnectorElement(candidate) &&
            candidate.sourceElementId !== undefined &&
            candidate.targetElementId !== undefined
          );
        },
      );

      if (nextIdsToMove.length === 0) {
        return;
      }

      surface.setPointerCapture(event.pointerId);
      pointerId = event.pointerId;
      hitId = id;
      idsToMove = nextIdsToMove;
      baseline = latestRef.current.elements;
      startLocal = local;
      startWorld = latestRef.current.viewport.screenToWorld(local);
      isActive = false;
    }

    function handlePointerMove(event: PointerEvent): void {
      if (
        pointerId === null ||
        event.pointerId !== pointerId ||
        startLocal === null ||
        startWorld === null
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
        setIsMoving(true);
      }

      const moveElements = latestRef.current.onMoveElements;

      if (moveElements === undefined) {
        return;
      }

      const worldCurrent = latestRef.current.viewport.screenToWorld(current);
      const result = moveElementsByDelta(baseline, idsToMove, worldCurrent.subtract(startWorld));

      if (result.status === 'ok') {
        moveElements(result.elements);
      }
    }

    function handlePointerUp(event: PointerEvent): void {
      if (pointerId === null || event.pointerId !== pointerId) {
        return;
      }

      const wasActive = isActive;
      const pressedId = hitId;
      reset();

      if (wasActive) {
        latestRef.current.onTransformEnd?.();
        return;
      }

      if (pressedId !== null) {
        latestRef.current.onSelectOnly?.(pressedId);
      }
    }

    function handlePointerCancel(event: PointerEvent): void {
      if (pointerId === null || event.pointerId !== pointerId) {
        return;
      }

      const wasActive = isActive;
      reset();

      if (wasActive) {
        latestRef.current.onTransformEnd?.();
      }
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

  return { isMoving, ref: elementRef };
}
