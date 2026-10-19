import { useEffect, useRef } from 'react';
import type { Element } from '../../../domain/element';
import {
  bringElementsToFront,
  resolveSelectionKeyCommand,
  sendElementsToBack,
} from '../../../application/services';

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

export interface UseElementZOrderOptions {
  readonly elements: readonly Element[];
  readonly selectedIds: readonly string[];
  readonly onReorderElements?: (elements: readonly Element[]) => void;
  readonly disabled?: boolean;
}

export interface UseElementZOrderResult {
  readonly ref: React.RefObject<HTMLElement | null>;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest(EDITABLE_SELECTOR) !== null;
}

export function useElementZOrder({
  elements,
  selectedIds,
  onReorderElements,
  disabled = false,
}: UseElementZOrderOptions): UseElementZOrderResult {
  const elementRef = useRef<HTMLElement | null>(null);
  const latestRef = useRef({ elements, selectedIds, onReorderElements });
  latestRef.current = { elements, selectedIds, onReorderElements };

  useEffect(() => {
    const element = elementRef.current;
    if (element === null || disabled) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.repeat || isEditableTarget(event.target)) {
        return;
      }

      if (latestRef.current.selectedIds.length === 0) {
        return;
      }

      const command = resolveSelectionKeyCommand({
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
      });

      if (command !== 'bring-to-front' && command !== 'send-to-back') {
        return;
      }

      const onReorder = latestRef.current.onReorderElements;

      if (onReorder === undefined) {
        return;
      }

      event.preventDefault();

      const result =
        command === 'bring-to-front'
          ? bringElementsToFront(latestRef.current.elements, latestRef.current.selectedIds)
          : sendElementsToBack(latestRef.current.elements, latestRef.current.selectedIds);

      if (result.status === 'error') {
        return;
      }

      onReorder(result.elements);
    }

    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled]);

  return { ref: elementRef };
}
