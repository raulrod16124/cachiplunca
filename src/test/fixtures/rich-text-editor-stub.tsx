import type { CSSProperties, FocusEvent, KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import type { UpdateElementInput } from '../../application/commands';
import type { TextElement } from '../../domain/element';
import { richTextFromPlain, richTextToPlain } from '../../domain/element';

export interface RichTextEditorProps {
  readonly element: TextElement;
  readonly onCommit: (input: UpdateElementInput) => void;
  readonly onCancel: () => void;
  readonly onEditorReady?: (editor: unknown) => void;
  readonly commitGuardRef?: { readonly current: boolean };
}

function boxStyle(element: TextElement): CSSProperties {
  return {
    position: 'absolute',
    left: element.position.x,
    top: element.position.y,
    width: element.size.width,
    height: element.size.height,
    transform: `rotate(${element.rotation}deg)`,
  };
}

/**
 * Test double for the lazy Tiptap editor. ProseMirror needs DOM geometry APIs
 * that jsdom does not implement, so integration tests exercise the overlay and
 * canvas orchestration against this plain-textarea stand-in instead. The real
 * editor logic is covered by the rich-text, adapter and headless-editor tests.
 */
export function RichTextEditor({
  element,
  onCommit,
  onCancel,
  onEditorReady,
  commitGuardRef,
}: RichTextEditorProps): ReactElement {
  const valueRef = useRef(richTextToPlain(element.content));
  const cancelledRef = useRef(false);

  useEffect(() => {
    onEditorReady?.(null);

    return () => {
      onEditorReady?.(null);
    };
  }, [onEditorReady]);

  const cancel = (): void => {
    cancelledRef.current = true;
    onCancel();
  };

  const commit = (): void => {
    if (cancelledRef.current) {
      return;
    }

    const next = richTextFromPlain(valueRef.current);

    if (richTextToPlain(next) === richTextToPlain(element.content)) {
      cancel();
      return;
    }

    onCommit({ type: 'text', element, content: next });
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
      return;
    }

    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      commit();
    }
  };

  const handleBlur = (_event: FocusEvent<HTMLTextAreaElement>): void => {
    if (commitGuardRef?.current === true) {
      return;
    }

    commit();
  };

  return (
    <textarea
      data-testid="element-editor"
      data-editor-field="content"
      aria-label="Text content"
      style={boxStyle(element)}
      defaultValue={valueRef.current}
      autoFocus
      onChange={(event) => {
        valueRef.current = event.target.value;
      }}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    />
  );
}
