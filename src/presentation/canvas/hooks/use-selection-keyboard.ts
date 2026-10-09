import { useEffect, useRef } from 'react';
import { resolveSelectionKeyCommand } from '../../../application/services';

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

export interface UseSelectionKeyboardOptions {
  readonly allIds: readonly string[];
  readonly onClear: () => void;
  readonly onSelectAll: (ids: readonly string[]) => void;
  readonly disabled?: boolean;
}

export interface UseSelectionKeyboardResult {
  readonly ref: React.RefObject<HTMLElement | null>;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest(EDITABLE_SELECTOR) !== null;
}

export function useSelectionKeyboard({
  allIds,
  onClear,
  onSelectAll,
  disabled = false,
}: UseSelectionKeyboardOptions): UseSelectionKeyboardResult {
  const elementRef = useRef<HTMLElement | null>(null);
  const latestRef = useRef({ allIds, onClear, onSelectAll });
  latestRef.current = { allIds, onClear, onSelectAll };

  useEffect(() => {
    const element = elementRef.current;
    if (element === null || disabled) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.repeat || isEditableTarget(event.target)) {
        return;
      }

      const command = resolveSelectionKeyCommand({
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
      });

      if (command === null) {
        return;
      }

      event.preventDefault();

      if (command === 'select-all') {
        latestRef.current.onSelectAll(latestRef.current.allIds);
        return;
      }

      latestRef.current.onClear();
    }

    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled]);

  return { ref: elementRef };
}
