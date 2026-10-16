import { useEffect, useRef } from 'react';

const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, [contenteditable="true"], [role="button"]';

export interface UseCanvasFocusOptions {
  readonly disabled?: boolean;
}

export interface UseCanvasFocusResult {
  readonly ref: React.RefObject<HTMLElement | null>;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest(INTERACTIVE_SELECTOR) !== null;
}

export function useCanvasFocus({
  disabled = false,
}: UseCanvasFocusOptions = {}): UseCanvasFocusResult {
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;

    if (element === null || disabled) {
      return;
    }

    const surface: HTMLElement = element;

    function handlePointerDown(event: PointerEvent): void {
      if (isInteractiveTarget(event.target)) {
        return;
      }

      if (document.activeElement === surface) {
        return;
      }

      surface.focus({ preventScroll: true });
    }

    surface.addEventListener('pointerdown', handlePointerDown);

    return () => {
      surface.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [disabled]);

  return { ref: elementRef };
}
