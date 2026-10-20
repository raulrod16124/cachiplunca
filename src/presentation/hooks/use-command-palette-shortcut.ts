import { useEffect, useRef } from 'react';

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';
const OPEN_MODAL_SELECTOR = '[role="dialog"][aria-modal="true"]';

export interface UseCommandPaletteShortcutOptions {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest(EDITABLE_SELECTOR) !== null;
}

function hasOpenModal(): boolean {
  return document.querySelector(OPEN_MODAL_SELECTOR) !== null;
}

export function useCommandPaletteShortcut({
  open,
  onOpenChange,
}: UseCommandPaletteShortcutOptions): void {
  const latestRef = useRef({ open, onOpenChange });
  latestRef.current = { open, onOpenChange };

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.key.toLocaleLowerCase() !== 'k' ||
        (!event.metaKey && !event.ctrlKey)
      ) {
        return;
      }

      if (latestRef.current.open) {
        event.preventDefault();
        latestRef.current.onOpenChange(false);
        return;
      }

      if (isEditableTarget(event.target) || hasOpenModal()) {
        return;
      }

      event.preventDefault();
      latestRef.current.onOpenChange(true);
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
