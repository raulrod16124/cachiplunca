import { EditorContent, useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import BulletList from '@tiptap/extension-bullet-list';
import Document from '@tiptap/extension-document';
import Heading from '@tiptap/extension-heading';
import Highlight from '@tiptap/extension-highlight';
import History from '@tiptap/extension-history';
import Italic from '@tiptap/extension-italic';
import ListItem from '@tiptap/extension-list-item';
import OrderedList from '@tiptap/extension-ordered-list';
import Paragraph from '@tiptap/extension-paragraph';
import Strike from '@tiptap/extension-strike';
import Text from '@tiptap/extension-text';
import TextAlign from '@tiptap/extension-text-align';
import { Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import type { FocusEvent, KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import type { RichTextDocument } from '../../../domain/element';
import { richTextToPlain } from '../../../domain/element';
import { normalizeSingleLineDocument } from '../text-format/editable-text-element';
import { docToEditorJson, editorJsonToDoc } from '../text-format/rich-text-adapter';

const Surface = styled.div`
  box-sizing: border-box;
  min-width: 0;
  user-select: text;
  caret-color: auto;

  .ProseMirror {
    outline: none;
    min-height: 1.4em;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .ProseMirror p {
    margin: 0;
  }

  .ProseMirror h1,
  .ProseMirror h2,
  .ProseMirror h3 {
    margin: 0;
    font-weight: 700;
    line-height: 1.3;
  }

  .ProseMirror h1 {
    font-size: 1.5em;
  }

  .ProseMirror h2 {
    font-size: 1.25em;
  }

  .ProseMirror h3 {
    font-size: 1.1em;
  }

  .ProseMirror ul,
  .ProseMirror ol {
    margin: 0;
    padding-left: 1.25em;
  }
`;

export interface RichTextEditorProps {
  readonly document: RichTextDocument;
  readonly ariaLabel: string;
  readonly dataField: 'content' | 'title';
  readonly singleLine?: boolean;
  readonly autoFocus?: boolean;
  readonly selectAllOnFocus?: boolean;
  readonly onChange?: (document: RichTextDocument) => void;
  readonly onCommit: (document: RichTextDocument) => void;
  readonly onCancel: () => void;
  readonly onEditorReady?: (editor: Editor | null) => void;
  /** While `true`, blur must not commit (e.g. the floating toolbar is open). */
  readonly commitGuardRef?: { readonly current: boolean };
}

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
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const cancelledRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const onEditorReadyRef = useRef(onEditorReady);
  onChangeRef.current = onChange;
  onEditorReadyRef.current = onEditorReady;

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Bold,
      Italic,
      Highlight.configure({ multicolor: true }),
      Underline,
      Strike,
      Heading.configure({ levels: [1, 2, 3] }),
      BulletList,
      OrderedList,
      ListItem,
      History,
      TextStyle,
      Color,
      FontFamily,
      FontSize.configure({ types: ['textStyle'] }),
      TextAlign.configure({ types: ['paragraph', 'heading'] }),
    ],
    content: docToEditorJson(document),
    editorProps: {
      attributes: {
        'data-testid': 'rich-text-editor-surface',
        'data-editor-field': dataField,
        'aria-label': ariaLabel,
      },
      handleKeyDown: (_view, event) => {
        if (singleLine && event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          return true;
        }

        return false;
      },
      transformPastedText: singleLine ? (text) => text.replace(/\s*\n+\s*/g, ' ') : undefined,
    },
    onUpdate: ({ editor: current }) => {
      onChangeRef.current?.(editorJsonToDoc(current.getJSON()));
    },
  });

  useEffect(() => {
    onEditorReadyRef.current?.(editor ?? null);

    return () => {
      onEditorReadyRef.current?.(null);
    };
  }, [editor]);

  useEffect(() => {
    if (editor === null || !autoFocus) {
      return;
    }

    const timer = window.setTimeout(() => {
      editor.commands.focus('end', { scrollIntoView: false });

      if (selectAllOnFocus) {
        editor.commands.selectAll();
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [editor, autoFocus, selectAllOnFocus]);

  const cancel = (): void => {
    cancelledRef.current = true;
    onCancel();
  };

  const commit = (): void => {
    if (cancelledRef.current || editor === null || editor.isDestroyed) {
      return;
    }

    const next = editorJsonToDoc(editor.getJSON());
    onCommit(singleLine ? normalizeSingleLineDocument(next) : next);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancel();
      return;
    }

    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      commit();
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>): void => {
    if (commitGuardRef?.current === true) {
      return;
    }

    if (event.relatedTarget instanceof Node && surfaceRef.current?.contains(event.relatedTarget)) {
      return;
    }

    commit();
  };

  return (
    <Surface
      ref={surfaceRef}
      data-testid="element-editor"
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      {editor === null ? null : <EditorContent editor={editor} />}
    </Surface>
  );
}

export function richTextIsEmpty(document: RichTextDocument): boolean {
  return richTextToPlain(document).trim().length === 0;
}
