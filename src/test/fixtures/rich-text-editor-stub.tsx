import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import type { RichTextDocument } from '../../domain/element';
import { richTextFromPlain, richTextToPlain } from '../../domain/element';

export interface RichTextEditorProps {
  readonly document: RichTextDocument;
  readonly ariaLabel: string;
  readonly dataField: 'content' | 'title' | 'notes';
  readonly singleLine?: boolean;
  readonly autoFocus?: boolean;
  readonly selectAllOnFocus?: boolean;
  readonly onChange?: (document: RichTextDocument) => void;
  readonly onCommit: (document: RichTextDocument) => void;
  readonly onCancel: () => void;
  readonly onEditorReady?: (editor: unknown) => void;
  readonly commitGuardRef?: { readonly current: boolean };
}

/**
 * Test double for the lazy Tiptap editor. ProseMirror needs DOM geometry APIs
 * that jsdom does not implement, so integration tests exercise the overlay and
 * canvas orchestration against this plain-textarea stand-in instead. The real
 * editor logic is covered by the rich-text, adapter and headless-editor tests.
 */
export function RichTextEditor({
  document,
  ariaLabel,
  dataField,
  singleLine = false,
  autoFocus = false,
  selectAllOnFocus = false,
  onChange,
  onCommit,
  onCancel,
  onEditorReady,
  commitGuardRef,
}: RichTextEditorProps): ReactElement {
  const valueRef = useRef(richTextToPlain(document));

  useEffect(() => {
    onEditorReady?.(null);

    return () => {
      onEditorReady?.(null);
    };
  }, [onEditorReady]);

  const commit = (): void => {
    onCommit(richTextFromPlain(valueRef.current));
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      commit();
      return;
    }

    if (singleLine && event.key === 'Enter') {
      event.preventDefault();
    }
  };

  return (
    <textarea
      data-testid="element-editor"
      data-editor-field={dataField}
      aria-label={ariaLabel}
      style={{ boxSizing: 'border-box', width: '100%', resize: 'none' }}
      defaultValue={valueRef.current}
      autoFocus={autoFocus}
      onFocus={(event) => {
        if (selectAllOnFocus) {
          event.currentTarget.select();
        }
      }}
      onChange={(event) => {
        valueRef.current = event.target.value;
        onChange?.(richTextFromPlain(valueRef.current));
      }}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        if (commitGuardRef?.current === true) {
          return;
        }

        commit();
      }}
    />
  );
}
