import { useCallback, useLayoutEffect, useState } from 'react';

export interface ElementSize {
  readonly width: number;
  readonly height: number;
}

export interface UseElementSizeResult {
  readonly size: ElementSize | null;
  readonly ref: (node: HTMLElement | null) => void;
}

/**
 * Measures an element's rendered size, updating on resize. Used to cull the
 * canvas to the real visible area instead of assuming a fixed viewport size.
 *
 * Returns `null` until a non-empty size is measured (e.g. jsdom, which does no
 * layout), so consumers can fall back to a safe default and never cull
 * incorrectly.
 */
export function useElementSize(): UseElementSizeResult {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState<ElementSize | null>(null);

  const ref = useCallback((next: HTMLElement | null) => {
    setNode(next);
  }, []);

  useLayoutEffect(() => {
    if (node === null) {
      setSize(null);
      return;
    }

    const measure = (): void => {
      const rect = node.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      setSize((previous) => {
        if (previous !== null && previous.width === rect.width && previous.height === rect.height) {
          return previous;
        }

        return { width: rect.width, height: rect.height };
      });
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [node]);

  return { size, ref };
}
