import { useEffect, useRef } from 'react';
import type { Element } from '../../../domain/element';
import { deleteElements, resolveSelectionKeyCommand } from '../../../application/services';

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

export interface UseElementDeleteOptions {
  readonly elements: readonly Element[];
  readonly selectedIds: readonly string[];
  readonly onDeleteElements?: (elements: readonly Element[]) => void;
  readonly onSelectionCleared?: () => void;
  readonly disabled?: boolean;
}

export interface UseElementDeleteResult {
  readonly ref: React.RefObject<HTMLElement | null>;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest(EDITABLE_SELECTOR) !== null;
}

export function useElementDelete({
  elements,
  selectedIds,
  onDeleteElements,
  onSelectionCleared,
  disabled = false,
}: UseElementDeleteOptions): UseElementDeleteResult {
  const elementRef = useRef<HTMLElement | null>(null);
  const latestRef = useRef({ elements, selectedIds, onDeleteElements, onSelectionCleared });
  latestRef.current = { elements, selectedIds, onDeleteElements, onSelectionCleared };

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
      });

      if (command !== 'delete') {
        return;
      }

      event.preventDefault();

      const result = deleteElements(latestRef.current.elements, latestRef.current.selectedIds);

      if (result.status === 'error') {
        return;
      }

      latestRef.current.onDeleteElements?.(result.elements);
      latestRef.current.onSelectionCleared?.();
    }

    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled]);

  return { ref: elementRef };
}
