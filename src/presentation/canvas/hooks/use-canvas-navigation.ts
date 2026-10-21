import { useEffect, useRef, useState } from 'react';
import { findNextSelectable, resolveNavigationKey } from '../../../application/services';
import type { SelectableItem } from '../../../application/services';

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';
const ROTATE_HANDLE_SELECTOR = '[data-rotate-handle]';

export interface UseCanvasNavigationOptions {
  readonly items: readonly SelectableItem[];
  readonly selectedIds: readonly string[];
  readonly onNavigate: (nextId: string, additive: boolean) => void;
  readonly disabled?: boolean;
}

export interface UseCanvasNavigationResult {
  readonly activeId: string | null;
  readonly ref: React.RefObject<HTMLElement | null>;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest(EDITABLE_SELECTOR) !== null;
}

function isRotateHandleTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest(ROTATE_HANDLE_SELECTOR) !== null;
}

function lastSelected(selectedIds: readonly string[]): string | null {
  return selectedIds.length === 0 ? null : (selectedIds[selectedIds.length - 1] ?? null);
}

export function useCanvasNavigation({
  items,
  selectedIds,
  onNavigate,
  disabled = false,
}: UseCanvasNavigationOptions): UseCanvasNavigationResult {
  const elementRef = useRef<HTMLElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const latestRef = useRef({ items, selectedIds, onNavigate });
  latestRef.current = { items, selectedIds, onNavigate };

  const effectiveActiveId =
    activeId !== null && selectedIds.includes(activeId) ? activeId : lastSelected(selectedIds);
  const activeIdRef = useRef<string | null>(effectiveActiveId);
  activeIdRef.current = effectiveActiveId;

  useEffect(() => {
    const element = elementRef.current;
    if (element === null || disabled) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.repeat || isEditableTarget(event.target) || isRotateHandleTarget(event.target)) {
        return;
      }

      const command = resolveNavigationKey({
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
      });

      if (command === null) {
        return;
      }

      event.preventDefault();

      const nextId = findNextSelectable(
        latestRef.current.items,
        activeIdRef.current,
        command.direction,
      );

      if (nextId === null) {
        return;
      }

      activeIdRef.current = nextId;
      setActiveId(nextId);
      latestRef.current.onNavigate(nextId, command.additive);
    }

    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled]);

  return { activeId: effectiveActiveId, ref: elementRef };
}
