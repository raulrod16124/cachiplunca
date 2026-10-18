import { useCallback, useEffect, useRef, useState } from 'react';

export interface TextSelectionRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TextSelectionSnapshot {
  readonly rect: TextSelectionRect;
  readonly text: string;
}

export interface UseTextSelectionOptions {
  readonly active: boolean;
  readonly scopeRef?: React.RefObject<HTMLElement | null>;
  readonly onSelectionChange?: (snapshot: TextSelectionSnapshot | null) => void;
}

export interface UseTextSelectionResult {
  readonly snapshot: TextSelectionSnapshot | null;
}

export function readTextSelection(scope?: HTMLElement | null): TextSelectionSnapshot | null {
  const selection = window.getSelection();

  if (selection === null || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const text = range.toString();

  if (text.trim().length === 0) {
    return null;
  }

  if (scope !== null && scope !== undefined && !scope.contains(range.commonAncestorContainer)) {
    return null;
  }

  return { rect: selectionRect(range), text };
}

function selectionRect(range: Range): TextSelectionRect {
  const rects =
    typeof range.getClientRects === 'function'
      ? Array.from(range.getClientRects()).filter((rect) => rect.width > 0 || rect.height > 0)
      : [];

  if (rects.length === 0) {
    if (typeof range.getBoundingClientRect !== 'function') {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const bounds = range.getBoundingClientRect();
    return { x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height };
  }

  let minX = rects[0].left;
  let minY = rects[0].top;
  let maxX = rects[0].right;
  let maxY = rects[0].bottom;

  for (const rect of rects.slice(1)) {
    minX = Math.min(minX, rect.left);
    minY = Math.min(minY, rect.top);
    maxX = Math.max(maxX, rect.right);
    maxY = Math.max(maxY, rect.bottom);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function useTextSelection({
  active,
  scopeRef,
  onSelectionChange,
}: UseTextSelectionOptions): UseTextSelectionResult {
  const [snapshot, setSnapshot] = useState<TextSelectionSnapshot | null>(null);
  const latestRef = useRef({ active, scopeRef, onSelectionChange });
  latestRef.current = { active, scopeRef, onSelectionChange };

  const refresh = useCallback((): TextSelectionSnapshot | null => {
    const next = readTextSelection(latestRef.current.scopeRef?.current ?? null);
    setSnapshot(next);
    latestRef.current.onSelectionChange?.(next);
    return next;
  }, []);

  useEffect(() => {
    if (!latestRef.current.active) {
      setSnapshot(null);
      return;
    }

    document.addEventListener('selectionchange', refresh);
    refresh();

    return () => {
      document.removeEventListener('selectionchange', refresh);
    };
  }, [refresh, active]);

  return { snapshot };
}
