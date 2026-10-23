import { useEffect, useRef } from 'react';
import type { Element } from '../../../domain/element';
import type { ElementId, Position } from '../../../domain/shared';
import {
  classifyClipboardPayload,
  copyElements,
  pasteElements,
  resolveSelectionKeyCommand,
} from '../../../application/services';

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

export interface UseElementCopyPasteOptions {
  readonly elements: readonly Element[];
  readonly selectedIds: readonly string[];
  readonly generateId?: () => ElementId;
  readonly onPasteElements?: (elements: readonly Element[], pastedIds: readonly string[]) => void;
  readonly onPasteText?: (text: string) => void;
  readonly onPasteImage?: (file: File) => void;
  readonly now?: () => Date;
  readonly offset?: Position;
  readonly disabled?: boolean;
}

export interface UseElementCopyPasteResult {
  readonly ref: React.RefObject<HTMLElement | null>;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest(EDITABLE_SELECTOR) !== null;
}

export function useElementCopyPaste({
  elements,
  selectedIds,
  generateId,
  onPasteElements,
  onPasteText,
  onPasteImage,
  now,
  offset,
  disabled = false,
}: UseElementCopyPasteOptions): UseElementCopyPasteResult {
  const elementRef = useRef<HTMLElement | null>(null);
  const clipboardRef = useRef<readonly Element[]>([]);
  const latestRef = useRef({
    elements,
    selectedIds,
    generateId,
    onPasteElements,
    onPasteText,
    onPasteImage,
    now,
    offset,
  });
  latestRef.current = {
    elements,
    selectedIds,
    generateId,
    onPasteElements,
    onPasteText,
    onPasteImage,
    now,
    offset,
  };

  useEffect(() => {
    const element = elementRef.current;
    if (element === null || disabled) {
      return;
    }

    let active = true;
    let internalPastePending = false;

    function performInternalPaste(): void {
      const { generateId, onPasteElements } = latestRef.current;

      if (generateId === undefined || onPasteElements === undefined) {
        return;
      }

      if (clipboardRef.current.length === 0) {
        return;
      }

      const result = pasteElements(latestRef.current.elements, clipboardRef.current, {
        generateId,
        now: latestRef.current.now,
        offset: latestRef.current.offset,
      });

      if (result.status === 'error') {
        return;
      }

      onPasteElements(result.elements, result.pastedIds);
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

      if (command === 'copy') {
        if (latestRef.current.selectedIds.length === 0) {
          return;
        }

        const result = copyElements(latestRef.current.elements, latestRef.current.selectedIds);

        if (result.status === 'error' || result.copiedElements.length === 0) {
          return;
        }

        event.preventDefault();
        clipboardRef.current = result.copiedElements;
        return;
      }

      if (command !== 'paste') {
        return;
      }

      const { generateId, onPasteElements } = latestRef.current;

      if (generateId === undefined || onPasteElements === undefined) {
        return;
      }

      if (clipboardRef.current.length === 0) {
        return;
      }

      internalPastePending = true;
      queueMicrotask(() => {
        if (!active || !internalPastePending) {
          return;
        }

        internalPastePending = false;
        performInternalPaste();
      });
    }

    function handlePaste(event: ClipboardEvent): void {
      internalPastePending = false;

      if (isEditableTarget(event.target)) {
        return;
      }

      const payload = classifyClipboardPayload(event.clipboardData);

      if (payload.kind === 'image') {
        const onPasteImage = latestRef.current.onPasteImage;

        if (onPasteImage === undefined) {
          return;
        }

        event.preventDefault();
        onPasteImage(payload.file);
        return;
      }

      if (payload.kind === 'text') {
        const onPasteText = latestRef.current.onPasteText;

        if (onPasteText === undefined) {
          return;
        }

        event.preventDefault();
        onPasteText(payload.text);
        return;
      }

      const { generateId, onPasteElements } = latestRef.current;

      if (generateId === undefined || onPasteElements === undefined) {
        return;
      }

      if (clipboardRef.current.length === 0) {
        return;
      }

      event.preventDefault();
      performInternalPaste();
    }

    element.addEventListener('keydown', handleKeyDown);
    element.addEventListener('paste', handlePaste);

    return () => {
      active = false;
      internalPastePending = false;
      element.removeEventListener('keydown', handleKeyDown);
      element.removeEventListener('paste', handlePaste);
    };
  }, [disabled]);

  return { ref: elementRef };
}
