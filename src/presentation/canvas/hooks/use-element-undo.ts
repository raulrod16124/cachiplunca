import { useEffect, useRef } from 'react';
import type { Element } from '../../../domain/element';
import type { CommandHistory } from '../../../application/services';
import { resolveSelectionKeyCommand } from '../../../application/services';

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

export interface UseElementUndoOptions {
  readonly history?: CommandHistory<readonly Element[]>;
  readonly onUndoElements?: (elements: readonly Element[]) => void;
  readonly disabled?: boolean;
}

export interface UseElementUndoResult {
  readonly ref: React.RefObject<HTMLElement | null>;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest(EDITABLE_SELECTOR) !== null;
}

export function useElementUndo({
  history,
  onUndoElements,
  disabled = false,
}: UseElementUndoOptions): UseElementUndoResult {
  const elementRef = useRef<HTMLElement | null>(null);
  const latestRef = useRef({ history, onUndoElements });
  latestRef.current = { history, onUndoElements };

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
        shiftKey: event.shiftKey,
      });

      if (command !== 'undo') {
        return;
      }

      const history = latestRef.current.history;

      if (history === undefined || !history.canUndo()) {
        return;
      }

      event.preventDefault();

      const result = history.undo();

      if (result.status === 'error') {
        return;
      }

      latestRef.current.onUndoElements?.(result.state);
    }

    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled]);

  return { ref: elementRef };
}
