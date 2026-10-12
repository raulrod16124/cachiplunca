import { useEffect, useRef } from 'react';
import type { Element } from '../../../domain/element';
import type { ElementId } from '../../../domain/shared';
import { duplicateElements, resolveSelectionKeyCommand } from '../../../application/services';

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

export interface UseElementDuplicateOptions {
  readonly elements: readonly Element[];
  readonly selectedIds: readonly string[];
  readonly generateId?: () => ElementId;
  readonly onDuplicateElements?: (
    elements: readonly Element[],
    duplicatedIds: readonly string[],
  ) => void;
  readonly disabled?: boolean;
}

export interface UseElementDuplicateResult {
  readonly ref: React.RefObject<HTMLElement | null>;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest(EDITABLE_SELECTOR) !== null;
}

export function useElementDuplicate({
  elements,
  selectedIds,
  generateId,
  onDuplicateElements,
  disabled = false,
}: UseElementDuplicateOptions): UseElementDuplicateResult {
  const elementRef = useRef<HTMLElement | null>(null);
  const latestRef = useRef({ elements, selectedIds, generateId, onDuplicateElements });
  latestRef.current = { elements, selectedIds, generateId, onDuplicateElements };

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

      if (command !== 'duplicate') {
        return;
      }

      const generateId = latestRef.current.generateId;
      const onDuplicate = latestRef.current.onDuplicateElements;

      if (generateId === undefined || onDuplicate === undefined) {
        return;
      }

      event.preventDefault();

      const result = duplicateElements(latestRef.current.elements, latestRef.current.selectedIds, {
        generateId,
      });

      if (result.status === 'error') {
        return;
      }

      onDuplicate(result.elements, result.duplicatedIds);
    }

    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled]);

  return { ref: elementRef };
}
