import { useEffect, useLayoutEffect, useRef } from 'react';

const ROVING_ITEM_SELECTOR = [
  'button',
  '[role="button"]',
  'a[href]',
  'input',
  'select',
  'textarea',
  '[tabindex]',
].join(',');

export type RovingOrientation = 'horizontal' | 'vertical' | 'both';

export interface UseRovingFocusOptions {
  readonly orientation?: RovingOrientation;
  readonly disabled?: boolean;
}

export interface UseRovingFocusResult<T extends HTMLElement = HTMLElement> {
  readonly ref: React.RefObject<T | null>;
}

type RovingStep = 'next' | 'previous' | 'first' | 'last';

function isEnabledItem(element: HTMLElement): boolean {
  const disabled = 'disabled' in element && Boolean((element as { disabled?: boolean }).disabled);

  return !disabled && element.getAttribute('aria-disabled') !== 'true';
}

function collectItems(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(ROVING_ITEM_SELECTOR)).filter(
    isEnabledItem,
  );
}

function applyActiveIndex(items: readonly HTMLElement[], activeIndex: number): void {
  items.forEach((item, index) => {
    item.tabIndex = index === activeIndex ? 0 : -1;
  });
}

function resolveStep(key: string, orientation: RovingOrientation): RovingStep | null {
  switch (key) {
    case 'ArrowRight':
      return orientation === 'vertical' ? null : 'next';
    case 'ArrowLeft':
      return orientation === 'vertical' ? null : 'previous';
    case 'ArrowDown':
      return orientation === 'horizontal' ? null : 'next';
    case 'ArrowUp':
      return orientation === 'horizontal' ? null : 'previous';
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    default:
      return null;
  }
}

function resolveActiveIndex(items: readonly HTMLElement[], activeIndex: number): number {
  return activeIndex >= 0 && activeIndex < items.length ? activeIndex : 0;
}

function moveFocus(items: readonly HTMLElement[], activeIndex: number, step: RovingStep): number {
  switch (step) {
    case 'next':
      return (activeIndex + 1) % items.length;
    case 'previous':
      return (activeIndex - 1 + items.length) % items.length;
    case 'first':
      return 0;
    case 'last':
      return items.length - 1;
  }
}

export function useRovingFocus<T extends HTMLElement = HTMLElement>({
  orientation = 'both',
  disabled = false,
}: UseRovingFocusOptions = {}): UseRovingFocusResult<T> {
  const elementRef = useRef<T | null>(null);
  const activeIndexRef = useRef(0);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const optionsRef = useRef({ orientation });
  optionsRef.current = { orientation };

  useEffect(() => {
    const container = elementRef.current;

    if (container === null || disabled) {
      return;
    }

    const surface: HTMLElement = container;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.defaultPrevented) {
        return;
      }

      const step = resolveStep(event.key, optionsRef.current.orientation);

      if (step === null) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const items = collectItems(surface);

      if (items.length === 0) {
        return;
      }

      const activeIndex = resolveActiveIndex(items, activeIndexRef.current);
      const nextIndex = moveFocus(items, activeIndex, step);

      activeIndexRef.current = nextIndex;
      lastFocusedRef.current = items[nextIndex] ?? null;
      applyActiveIndex(items, nextIndex);
      items[nextIndex]?.focus();
    }

    function handleFocusIn(event: FocusEvent): void {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      const items = collectItems(surface);
      const index = items.indexOf(event.target);

      if (index === -1) {
        return;
      }

      activeIndexRef.current = index;
      lastFocusedRef.current = event.target;
      applyActiveIndex(items, index);
    }

    function handleFocusOut(event: FocusEvent): void {
      const next = event.relatedTarget;

      if (next instanceof Node && surface.contains(next)) {
        return;
      }

      const lastFocused = lastFocusedRef.current;

      if (lastFocused === null || !surface.contains(lastFocused) || isEnabledItem(lastFocused)) {
        return;
      }

      const items = collectItems(surface);
      const activeIndex = resolveActiveIndex(items, activeIndexRef.current);

      items[activeIndex]?.focus();
    }

    surface.addEventListener('keydown', handleKeyDown);
    surface.addEventListener('focusin', handleFocusIn);
    surface.addEventListener('focusout', handleFocusOut);

    return () => {
      surface.removeEventListener('keydown', handleKeyDown);
      surface.removeEventListener('focusin', handleFocusIn);
      surface.removeEventListener('focusout', handleFocusOut);
    };
  }, [disabled]);

  useLayoutEffect(() => {
    const container = elementRef.current;

    if (container === null || disabled) {
      return;
    }

    const surface: HTMLElement = container;
    const items = collectItems(surface);
    const activeIndex = resolveActiveIndex(items, activeIndexRef.current);

    activeIndexRef.current = activeIndex;
    applyActiveIndex(items, activeIndex);

    const lastFocused = lastFocusedRef.current;
    const activeElement = document.activeElement;
    const focusLeft =
      lastFocused !== null &&
      surface.contains(lastFocused) &&
      !isEnabledItem(lastFocused) &&
      !(activeElement instanceof Node && surface.contains(activeElement));
    const activeIsDisabled =
      activeElement instanceof HTMLElement &&
      surface.contains(activeElement) &&
      !isEnabledItem(activeElement);

    if ((focusLeft || activeIsDisabled) && items.length > 0) {
      items[activeIndex]?.focus();
    }
  });

  return { ref: elementRef };
}
