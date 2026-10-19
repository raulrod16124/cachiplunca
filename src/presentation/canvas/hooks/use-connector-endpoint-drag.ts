import { useEffect, useRef } from 'react';
import { isConnectorElement, type Element as DomainElement } from '../../../domain/element';
import { Position } from '../../../domain/shared';
import type { Viewport } from '../../../domain/shared';
import type { ConnectorEndpointSide } from '../../../application/commands';
import { DRAG_SELECTION_THRESHOLD } from './use-drag-selection';

export interface ConnectorEndpointDragInput {
  readonly element: DomainElement;
  readonly side: ConnectorEndpointSide;
  readonly point: Position;
}

export interface UseConnectorEndpointDragOptions {
  readonly elements: readonly DomainElement[];
  readonly viewport: Viewport;
  readonly selectedIds: readonly string[];
  readonly onUpdateConnectorEndpoint?: (input: ConnectorEndpointDragInput) => void;
  readonly onTransformEnd?: () => void;
  readonly spacePressed?: boolean;
  readonly disabled?: boolean;
}

export interface UseConnectorEndpointDragResult {
  readonly ref: React.RefObject<HTMLElement | null>;
}

function isEndpointSide(value: string | undefined): value is ConnectorEndpointSide {
  return value === 'source' || value === 'target';
}

function endpointSideFromTarget(target: EventTarget | null): ConnectorEndpointSide | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const handle = target.closest('[data-connector-endpoint]');

  if (!(handle instanceof HTMLElement)) {
    return null;
  }

  const side = handle.dataset.connectorEndpointSide;

  return isEndpointSide(side) ? side : null;
}

function toLocalPoint(surface: HTMLElement, event: PointerEvent): Position {
  const bounds = surface.getBoundingClientRect();

  return Position.create(event.clientX - bounds.left, event.clientY - bounds.top);
}

export function useConnectorEndpointDrag({
  elements,
  viewport,
  selectedIds,
  onUpdateConnectorEndpoint,
  onTransformEnd,
  spacePressed = false,
  disabled = false,
}: UseConnectorEndpointDragOptions): UseConnectorEndpointDragResult {
  const elementRef = useRef<HTMLElement | null>(null);
  const latestRef = useRef({
    elements,
    viewport,
    selectedIds,
    onUpdateConnectorEndpoint,
    onTransformEnd,
    spacePressed,
  });
  latestRef.current = {
    elements,
    viewport,
    selectedIds,
    onUpdateConnectorEndpoint,
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
    let side: ConnectorEndpointSide | null = null;
    let connector: DomainElement | null = null;
    let startLocal: Position | null = null;
    let startWorld: Position | null = null;
    let isActive = false;

    function reset(): void {
      if (pointerId !== null && surface.hasPointerCapture(pointerId)) {
        surface.releasePointerCapture(pointerId);
      }

      pointerId = null;
      side = null;
      connector = null;
      startLocal = null;
      startWorld = null;
      isActive = false;
    }

    function handlePointerDown(event: PointerEvent): void {
      if (event.button !== 0 || latestRef.current.spacePressed) {
        return;
      }

      const pressedSide = endpointSideFromTarget(event.target);

      if (pressedSide === null) {
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

      const selectedElement = latestRef.current.elements.find(
        (candidate) => candidate.id.value === selectedId,
      );

      if (
        selectedElement === undefined ||
        !isConnectorElement(selectedElement) ||
        selectedElement.sourcePoint === undefined ||
        selectedElement.targetPoint === undefined
      ) {
        return;
      }

      const local = toLocalPoint(surface, event);

      surface.setPointerCapture(event.pointerId);
      pointerId = event.pointerId;
      side = pressedSide;
      connector = selectedElement;
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
        side === null ||
        connector === null
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
      }

      const update = latestRef.current.onUpdateConnectorEndpoint;

      if (update === undefined) {
        return;
      }

      const worldCurrent = latestRef.current.viewport.screenToWorld(current);
      update({ element: connector, side, point: worldCurrent });
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

  return { ref: elementRef };
}
