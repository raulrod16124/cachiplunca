import { useEffect, useRef } from 'react';
import { Position } from '../../../domain/shared';
import type { Viewport } from '../../../domain/shared';
import { findSelectableAt } from '../../../application/services';
import type { SelectableItem } from '../../../application/services';

export interface UseSelectionOptions {
  readonly items: readonly SelectableItem[];
  readonly viewport: Viewport;
  readonly onSelect: (id: string | null, additive: boolean) => void;
  readonly disabled?: boolean;
}

export interface UseSelectionResult {
  readonly ref: React.RefObject<HTMLElement | null>;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest('button, a, input, textarea, select, [role="button"]') !== null;
}

export function useSelection({
  items,
  viewport,
  onSelect,
  disabled = false,
}: UseSelectionOptions): UseSelectionResult {
  const elementRef = useRef<HTMLElement | null>(null);
  const latestRef = useRef({ items, viewport, onSelect });
  latestRef.current = { items, viewport, onSelect };

  useEffect(() => {
    const element = elementRef.current;
    if (element === null || disabled) {
      return;
    }

    const surface: HTMLElement = element;

    function handlePointerDown(event: PointerEvent): void {
      if (event.button !== 0 || isInteractiveTarget(event.target)) {
        return;
      }

      const rect = surface.getBoundingClientRect();
      const screenPoint = Position.create(event.clientX - rect.left, event.clientY - rect.top);
      const worldPoint = latestRef.current.viewport.screenToWorld(screenPoint);
      const hit = findSelectableAt(latestRef.current.items, worldPoint);
      const additive = event.shiftKey || event.metaKey || event.ctrlKey;

      latestRef.current.onSelect(hit, additive);
    }

    element.addEventListener('pointerdown', handlePointerDown);

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [disabled]);

  return { ref: elementRef };
}
