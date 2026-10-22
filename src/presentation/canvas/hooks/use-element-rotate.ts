import { useEffect, useRef, useState } from 'react';
import { isConnectorElement, type Element } from '../../../domain/element';
import { Position } from '../../../domain/shared';
import type { Viewport } from '../../../domain/shared';
import { angleAt, computeRotation, rotateElementTo } from '../../../application/services';
import { DRAG_SELECTION_THRESHOLD } from './use-drag-selection';

const ROTATION_KEY_STEP = 1;
const ROTATION_KEY_SNAP_STEP = 15;

export interface UseElementRotateOptions {
  readonly elements: readonly Element[];
  readonly viewport: Viewport;
  readonly selectedIds: readonly string[];
  readonly onRotateElements?: (elements: readonly Element[]) => void;
  readonly onTransformEnd?: () => void;
  readonly spacePressed?: boolean;
  readonly disabled?: boolean;
}

export interface UseElementRotateResult {
  readonly isRotating: boolean;
  readonly ref: React.RefObject<HTMLElement | null>;
}

function isRotateHandleTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest('[data-rotate-handle]') !== null;
}

function toLocalPoint(surface: HTMLElement, event: PointerEvent): Position {
  const bounds = surface.getBoundingClientRect();

  return Position.create(event.clientX - bounds.left, event.clientY - bounds.top);
}

function selectedElement(
  elements: readonly Element[],
  selectedIds: readonly string[],
): Element | null {
  if (selectedIds.length !== 1) {
    return null;
  }

  const selectedId = selectedIds[0];

  if (selectedId === undefined) {
    return null;
  }

  const element = elements.find((item) => item.id.value === selectedId) ?? null;

  if (element === null || isConnectorElement(element)) {
    return null;
  }

  return element;
}

function rotationStepForKey(key: string): number | null {
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowUp':
      return -ROTATION_KEY_STEP;
    case 'ArrowRight':
    case 'ArrowDown':
      return ROTATION_KEY_STEP;
    default:
      return null;
  }
}

export function useElementRotate({
  elements,
  viewport,
  selectedIds,
  onRotateElements,
  onTransformEnd,
  spacePressed = false,
  disabled = false,
}: UseElementRotateOptions): UseElementRotateResult {
  const [isRotating, setIsRotating] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const latestRef = useRef({
    elements,
    viewport,
    selectedIds,
    onRotateElements,
    onTransformEnd,
    spacePressed,
  });
  latestRef.current = {
    elements,
    viewport,
    selectedIds,
    onRotateElements,
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
    let targetId: string | null = null;
    let baselineElements: readonly Element[] = [];
    let baselineElement: Element | null = null;
    let center: Position | null = null;
    let startAngle = 0;
    let startLocal: Position | null = null;
    let activeHandle: HTMLElement | null = null;
    let isActive = false;

    function reset(): void {
      if (pointerId !== null && surface.hasPointerCapture(pointerId)) {
        surface.releasePointerCapture(pointerId);
      }

      if (activeHandle !== null) {
        delete activeHandle.dataset.dragging;
      }

      pointerId = null;
      targetId = null;
      baselineElements = [];
      baselineElement = null;
      center = null;
      startAngle = 0;
      startLocal = null;
      activeHandle = null;
      isActive = false;
      setIsRotating(false);
    }

    function handlePointerDown(event: PointerEvent): void {
      if (event.button !== 0 || latestRef.current.spacePressed) {
        return;
      }

      if (!isRotateHandleTarget(event.target)) {
        return;
      }

      const current = selectedElement(latestRef.current.elements, latestRef.current.selectedIds);

      if (current === null) {
        return;
      }

      const local = toLocalPoint(surface, event);
      const worldPoint = latestRef.current.viewport.screenToWorld(local);
      const elementCenter = Position.create(
        current.position.x + current.size.width / 2,
        current.position.y + current.size.height / 2,
      );

      surface.setPointerCapture(event.pointerId);
      pointerId = event.pointerId;
      targetId = current.id.value;
      baselineElements = latestRef.current.elements;
      baselineElement = current;
      center = elementCenter;
      startAngle = angleAt(elementCenter, worldPoint);
      startLocal = local;
      activeHandle =
        event.target instanceof Element
          ? (event.target.closest('[data-rotate-handle]') as HTMLElement | null)
          : null;

      if (activeHandle !== null) {
        activeHandle.dataset.dragging = 'true';
      }

      isActive = false;
    }

    function handlePointerMove(event: PointerEvent): void {
      if (
        pointerId === null ||
        event.pointerId !== pointerId ||
        startLocal === null ||
        center === null ||
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
        setIsRotating(true);
      }

      const rotateElements = latestRef.current.onRotateElements;

      if (rotateElements === undefined) {
        return;
      }

      const worldPoint = latestRef.current.viewport.screenToWorld(current);
      const rotation = computeRotation({
        center,
        pointer: worldPoint,
        startAngle,
        startRotation: baselineElement.rotation,
        snap: event.shiftKey,
      });
      const result = rotateElementTo(baselineElement, rotation);

      if (result.status !== 'ok') {
        return;
      }

      rotateElements(
        baselineElements.map((item) => (item.id.value === targetId ? result.element : item)),
      );
    }

    function handlePointerUp(event: PointerEvent): void {
      if (pointerId === null || event.pointerId !== pointerId) {
        return;
      }

      const wasActive = isActive;
      reset();

      if (wasActive) {
        latestRef.current.onTransformEnd?.();
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

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.repeat || event.altKey || event.metaKey || event.ctrlKey) {
        return;
      }

      if (!isRotateHandleTarget(event.target)) {
        return;
      }

      const step = rotationStepForKey(event.key);

      if (step === null) {
        return;
      }

      const current = selectedElement(latestRef.current.elements, latestRef.current.selectedIds);

      if (current === null) {
        return;
      }

      const rotateElements = latestRef.current.onRotateElements;

      if (rotateElements === undefined) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const delta = event.shiftKey ? step * ROTATION_KEY_SNAP_STEP : step;
      const result = rotateElementTo(current, current.rotation + delta);

      if (result.status !== 'ok') {
        return;
      }

      rotateElements(
        latestRef.current.elements.map((item) =>
          item.id.value === result.element.id.value ? result.element : item,
        ),
      );
      latestRef.current.onTransformEnd?.();
    }

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerUp);
    element.addEventListener('pointercancel', handlePointerCancel);
    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerCancel);
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled]);

  return { isRotating, ref: elementRef };
}
