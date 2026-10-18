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
import type {
  CSSProperties,
  FocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
} from 'react';
import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import type { UpdateElementInput } from '../../../application/commands';
import type { TextElement } from '../../../domain/element';
import { docToEditorJson, editorJsonToDoc } from '../text-format/rich-text-adapter';

const EditorShell = styled.div`
  position: absolute;
  box-sizing: border-box;
  transform-origin: center center;
  padding: 8px;
  overflow: auto;
  border: 1.5px solid ${({ theme }) => theme.canvas.selection};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.canvas.surface};
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.4;
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
  readonly element: TextElement;
  readonly onCommit: (input: UpdateElementInput) => void;
  readonly onCancel: () => void;
  readonly onEditorReady?: (editor: Editor | null) => void;
  /** While `true`, blur must not commit (e.g. the format context menu is open). */
  readonly commitGuardRef?: { readonly current: boolean };
}

function boxStyle(element: TextElement): CSSProperties {
  return {
    left: element.position.x,
    top: element.position.y,
    width: element.size.width,
    height: element.size.height,
    transform: `rotate(${element.rotation}deg)`,
  };
}

export function RichTextEditor({
  element,
  onCommit,
  onCancel,
  onEditorReady,
  commitGuardRef,
}: RichTextEditorProps): ReactElement {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const cancelledRef = useRef(false);
  const onEditorReadyRef = useRef(onEditorReady);
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
    content: docToEditorJson(element.content),
    editorProps: {
      attributes: {
        'data-testid': 'rich-text-editor-surface',
        'data-editor-field': 'content',
        'aria-label': 'Text content',
      },
    },
  });

  useEffect(() => {
    onEditorReadyRef.current?.(editor ?? null);

    return () => {
      onEditorReadyRef.current?.(null);
    };
  }, [editor]);

  useEffect(() => {
    if (editor === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      editor.commands.focus('end', { scrollIntoView: false });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [editor]);

  const cancel = (): void => {
    cancelledRef.current = true;
    onCancel();
  };

  const commit = (): void => {
    if (cancelledRef.current || editor === null || editor.isDestroyed) {
      return;
    }

    const next = editorJsonToDoc(editor.getJSON());

    if (JSON.stringify(next) === JSON.stringify(element.content)) {
      cancel();
      return;
    }

    onCommit({ type: 'text', element, content: next });
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

    if (event.relatedTarget instanceof Node && shellRef.current?.contains(event.relatedTarget)) {
      return;
    }

    commit();
  };

  return (
    <EditorShell
      ref={shellRef}
      style={boxStyle(element)}
      data-testid="element-editor"
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      {editor !== null ? <TextFormatToolbar editor={editor} /> : null}
      <EditorContent editor={editor} />
    </EditorShell>
  );
}
