import { useEffect, useRef } from 'react';

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

export interface UseElementEditOptions {
  readonly selectedIds: readonly string[];
  readonly onBeginEdit: (id: string) => void;
  readonly disabled?: boolean;
}

export interface UseElementEditResult {
  readonly ref: React.RefObject<HTMLElement | null>;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest(EDITABLE_SELECTOR) !== null;
}

function closestSelectableId(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const selectable = target.closest('[data-selectable]');

  if (!(selectable instanceof HTMLElement)) {
    return null;
  }

  return selectable.dataset.elementId ?? null;
}

export function useElementEdit({
  selectedIds,
  onBeginEdit,
  disabled = false,
}: UseElementEditOptions): UseElementEditResult {
  const elementRef = useRef<HTMLElement | null>(null);
  const latestRef = useRef({ selectedIds, onBeginEdit });
  latestRef.current = { selectedIds, onBeginEdit };

  useEffect(() => {
    const element = elementRef.current;
    if (element === null || disabled) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Enter' || event.repeat || isEditableTarget(event.target)) {
        return;
      }

      if (event.altKey || event.metaKey || event.ctrlKey) {
        return;
      }

      const ids = latestRef.current.selectedIds;

      if (ids.length !== 1 || ids[0] === undefined) {
        return;
      }

      event.preventDefault();
      latestRef.current.onBeginEdit(ids[0]);
    }

    function handleDoubleClick(event: MouseEvent): void {
      const id = closestSelectableId(event.target);

      if (id === null) {
        return;
      }

      latestRef.current.onBeginEdit(id);
    }

    element.addEventListener('keydown', handleKeyDown);
    element.addEventListener('dblclick', handleDoubleClick);

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
      element.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [disabled]);

  return { ref: elementRef };
}
