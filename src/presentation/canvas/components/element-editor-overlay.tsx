import type { Editor } from '@tiptap/core';
import type {
  CSSProperties,
  FocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
} from 'react';
import { lazy, Suspense, useRef, useState } from 'react';
import styled from 'styled-components';
import type { UpdateElementInput } from '../../../application/commands';
import type {
  Element,
  FrameElement,
  LinkElement,
  NoteElement,
  RichTextDocument,
  TaskElement,
  TextElement,
} from '../../../domain/element';
import {
  isFrameElement,
  isLinkElement,
  isNoteElement,
  isTaskElement,
  isTextElement,
  richTextFromPlain,
  richTextToPlain,
} from '../../../domain/element';

const LazyRichTextEditor = lazy(() =>
  import('./rich-text-editor').then((module) => ({ default: module.RichTextEditor })),
);

const EditorBox = styled.div`
  position: absolute;
  box-sizing: border-box;
  transform-origin: center center;
  padding: 8px;
  overflow: auto;
  border: 1.5px solid ${({ theme }) => theme.canvas.selection};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.canvas.surface};
  color: ${({ theme }) => theme.color.text.primary};
  font-family: inherit;
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.4;
`;

const NoteBox = styled(EditorBox)`
  padding: 12px;
`;

const UrlField = styled.input`
  box-sizing: border-box;
  width: 100%;
  padding: 0;
  border: none;
  outline: none;
  user-select: text;
  caret-color: auto;
  color: ${({ theme }) => theme.color.link.text};
  font-family: inherit;
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.4;
  background: transparent;

  &::placeholder {
    color: ${({ theme }) => theme.color.text.muted};
  }
`;

const TaskBox = styled(EditorBox)`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
`;

const TaskTitle = styled.div`
  flex: 0 0 auto;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  word-break: break-word;
`;

const TaskNotes = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 6px 8px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.color.background.sunken};
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size['2xs']};
`;

const FrameBox = styled(EditorBox)`
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  background-color: ${({ theme }) => theme.canvas.surfaceMuted};
`;

const FrameHeader = styled.div`
  padding: 8px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.canvas.elementBorder};
  background-color: ${({ theme }) => theme.canvas.surface};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  word-break: break-word;
`;

const LinkBox = styled(EditorBox)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 12px;
`;

const LinkTitle = styled.div`
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  word-break: break-word;
`;

export interface ElementEditorOverlayProps {
  readonly element: Element;
  readonly onCommit: (input: UpdateElementInput) => void;
  readonly onCancel: () => void;
  readonly onTextEditorReady?: (editor: Editor | null) => void;
  readonly textCommitGuardRef?: { readonly current: boolean };
}

type FieldEditorProps<TElement extends Element> = {
  readonly element: TElement;
  readonly onCommit: (input: UpdateElementInput) => void;
  readonly onCancel: () => void;
};

type RichTextFieldEditorProps = {
  readonly document: RichTextDocument;
  readonly ariaLabel: string;
  readonly dataField: 'content' | 'title' | 'notes';
  readonly singleLine?: boolean;
  readonly autoFocus?: boolean;
  readonly selectAllOnFocus?: boolean;
  readonly onChange?: (document: RichTextDocument) => void;
  readonly onCommit: (document: RichTextDocument) => void;
  readonly onCancel: () => void;
  readonly onEditorReady?: (editor: Editor | null) => void;
  readonly commitGuardRef?: { readonly current: boolean };
};

function boxStyle(element: Element): CSSProperties {
  return {
    left: element.position.x,
    top: element.position.y,
    width: element.size.width,
    height: element.size.height,
    transform: `rotate(${element.rotation}deg)`,
  };
}

function RichTextFieldEditor({
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
}: RichTextFieldEditorProps): ReactElement {
  return (
    <Suspense fallback={null}>
      <LazyRichTextEditor
        document={document}
        ariaLabel={ariaLabel}
        dataField={dataField}
        singleLine={singleLine}
        autoFocus={autoFocus}
        selectAllOnFocus={selectAllOnFocus}
        onChange={onChange}
        onCommit={onCommit}
        onCancel={onCancel}
        onEditorReady={onEditorReady}
        commitGuardRef={commitGuardRef}
      />
    </Suspense>
  );
}

function isContainedFocus(event: FocusEvent<HTMLElement>, container: HTMLElement | null): boolean {
  return event.relatedTarget instanceof Node && container?.contains(event.relatedTarget) === true;
}

function TextContentEditor({
  element,
  onCommit,
  onCancel,
  onEditorReady,
  commitGuardRef,
}: FieldEditorProps<TextElement> & {
  readonly onEditorReady?: (editor: Editor | null) => void;
  readonly commitGuardRef?: { readonly current: boolean };
}): ReactElement {
  const handleCommit = (document: RichTextDocument): void => {
    if (JSON.stringify(document) === JSON.stringify(element.content)) {
      onCancel();
      return;
    }

    onCommit({ type: 'text', element, content: document });
  };

  return (
    <EditorBox style={boxStyle(element)} data-testid="element-editor-box">
      <RichTextFieldEditor
        document={element.content}
        ariaLabel="Text content"
        dataField="content"
        autoFocus
        onCommit={handleCommit}
        onCancel={onCancel}
        onEditorReady={onEditorReady}
        commitGuardRef={commitGuardRef}
      />
    </EditorBox>
  );
}

function NoteContentEditor({
  element,
  onCommit,
  onCancel,
  onEditorReady,
  commitGuardRef,
}: FieldEditorProps<NoteElement> & {
  readonly onEditorReady?: (editor: Editor | null) => void;
  readonly commitGuardRef?: { readonly current: boolean };
}): ReactElement {
  const handleCommit = (document: RichTextDocument): void => {
    if (JSON.stringify(document) === JSON.stringify(element.content)) {
      onCancel();
      return;
    }

    onCommit({ type: 'note', element, content: document });
  };

  return (
    <NoteBox
      style={{
        ...boxStyle(element),
        ...(element.color === undefined ? {} : { backgroundColor: element.color }),
      }}
      data-testid="element-editor-box"
    >
      <RichTextFieldEditor
        document={element.content}
        ariaLabel="Note content"
        dataField="content"
        autoFocus
        onCommit={handleCommit}
        onCancel={onCancel}
        onEditorReady={onEditorReady}
        commitGuardRef={commitGuardRef}
      />
    </NoteBox>
  );
}

function TaskEditor({
  element,
  onCommit,
  onCancel,
  onEditorReady,
  commitGuardRef,
}: FieldEditorProps<TaskElement> & {
  readonly onEditorReady?: (editor: Editor | null) => void;
  readonly commitGuardRef?: { readonly current: boolean };
}): ReactElement {
  const initialTitle = element.title;
  const initialNotes = element.notes ?? richTextFromPlain('');
  const titleDraftRef = useRef<RichTextDocument>(element.title);
  const notesDraftRef = useRef<RichTextDocument>(initialNotes);
  const cancelledRef = useRef(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const cancel = (): void => {
    if (cancelledRef.current) {
      return;
    }

    cancelledRef.current = true;
    onCancel();
  };

  const commit = (): void => {
    if (cancelledRef.current) {
      return;
    }

    const title = titleDraftRef.current;
    const notes = notesDraftRef.current;
    const titleChanged = JSON.stringify(title) !== JSON.stringify(initialTitle);
    const notesChanged = JSON.stringify(notes) !== JSON.stringify(initialNotes);

    if (!titleChanged && !notesChanged) {
      cancel();
      return;
    }

    onCommit({
      type: 'task',
      element,
      ...(titleChanged ? { title } : {}),
      ...(notesChanged ? { notes } : {}),
    });
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
    if (isContainedFocus(event, boxRef.current)) {
      return;
    }

    if (commitGuardRef?.current === true) {
      return;
    }

    commit();
  };

  return (
    <TaskBox
      ref={boxRef}
      style={boxStyle(element)}
      data-testid="element-editor-box"
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      <TaskTitle>
        <RichTextFieldEditor
          document={element.title}
          ariaLabel="Task title"
          dataField="title"
          singleLine
          autoFocus
          selectAllOnFocus
          onChange={(document) => {
            titleDraftRef.current = document;
          }}
          onCommit={(document) => {
            titleDraftRef.current = document;
            commit();
          }}
          onCancel={cancel}
          onEditorReady={onEditorReady}
          commitGuardRef={commitGuardRef}
        />
      </TaskTitle>
      <TaskNotes>
        <RichTextFieldEditor
          document={initialNotes}
          ariaLabel="Task notes"
          dataField="notes"
          onChange={(document) => {
            notesDraftRef.current = document;
          }}
          onCommit={(document) => {
            notesDraftRef.current = document;
            commit();
          }}
          onCancel={cancel}
        />
      </TaskNotes>
    </TaskBox>
  );
}

function FrameTitleEditor({
  element,
  onCommit,
  onCancel,
  onEditorReady,
  commitGuardRef,
}: FieldEditorProps<FrameElement> & {
  readonly onEditorReady?: (editor: Editor | null) => void;
  readonly commitGuardRef?: { readonly current: boolean };
}): ReactElement {
  const handleCommit = (document: RichTextDocument): void => {
    if (JSON.stringify(document) === JSON.stringify(element.title)) {
      onCancel();
      return;
    }

    onCommit({ type: 'frame', element, title: document });
  };

  return (
    <FrameBox style={boxStyle(element)} data-testid="element-editor-box">
      <FrameHeader>
        <RichTextFieldEditor
          document={element.title}
          ariaLabel="Frame title"
          dataField="title"
          singleLine
          autoFocus
          onCommit={handleCommit}
          onCancel={onCancel}
          onEditorReady={onEditorReady}
          commitGuardRef={commitGuardRef}
        />
      </FrameHeader>
    </FrameBox>
  );
}

function LinkFieldsEditor({
  element,
  onCommit,
  onCancel,
  onEditorReady,
  commitGuardRef,
}: FieldEditorProps<LinkElement> & {
  readonly onEditorReady?: (editor: Editor | null) => void;
  readonly commitGuardRef?: { readonly current: boolean };
}): ReactElement {
  const [urlDraft, setUrlDraft] = useState(element.url);
  const titleDraftRef = useRef<RichTextDocument>(element.title ?? richTextFromPlain(''));
  const cancelledRef = useRef(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const initialTitle = element.title ?? richTextFromPlain('');

  const cancel = (): void => {
    cancelledRef.current = true;
    onCancel();
  };

  const commit = (): void => {
    if (cancelledRef.current) {
      return;
    }

    const titleDraft = titleDraftRef.current;

    if (JSON.stringify(titleDraft) === JSON.stringify(initialTitle) && urlDraft === element.url) {
      cancel();
      return;
    }

    onCommit({
      type: 'link',
      element,
      title: richTextToPlain(titleDraft).trim().length === 0 ? null : titleDraft,
      url: urlDraft,
    });
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
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
    if (isContainedFocus(event, boxRef.current)) {
      return;
    }

    if (commitGuardRef?.current === true) {
      return;
    }

    commit();
  };

  const handleUrlBlur = (event: FocusEvent<HTMLInputElement>): void => {
    if (isContainedFocus(event, boxRef.current)) {
      return;
    }

    if (commitGuardRef?.current === true) {
      return;
    }

    commit();
  };

  return (
    <LinkBox
      ref={boxRef}
      style={boxStyle(element)}
      data-testid="element-editor-box"
      onBlur={handleBlur}
    >
      <LinkTitle>
        <RichTextFieldEditor
          document={initialTitle}
          ariaLabel="Link title"
          dataField="title"
          singleLine
          onChange={(document) => {
            titleDraftRef.current = document;
          }}
          onCommit={(document) => {
            titleDraftRef.current = document;
          }}
          onCancel={cancel}
          onEditorReady={onEditorReady}
        />
      </LinkTitle>
      <UrlField
        data-editor-field="url"
        aria-label="Link URL"
        placeholder="https://example.com"
        autoFocus
        value={urlDraft}
        onChange={(event) => setUrlDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleUrlBlur}
      />
    </LinkBox>
  );
}

export function ElementEditorOverlay({
  element,
  onCommit,
  onCancel,
  onTextEditorReady,
  textCommitGuardRef,
}: ElementEditorOverlayProps): ReactElement | null {
  if (isTextElement(element)) {
    return (
      <TextContentEditor
        element={element}
        onCommit={onCommit}
        onCancel={onCancel}
        onEditorReady={onTextEditorReady}
        commitGuardRef={textCommitGuardRef}
      />
    );
  }

  if (isNoteElement(element)) {
    return (
      <NoteContentEditor
        element={element}
        onCommit={onCommit}
        onCancel={onCancel}
        onEditorReady={onTextEditorReady}
        commitGuardRef={textCommitGuardRef}
      />
    );
  }

  if (isTaskElement(element)) {
    return (
      <TaskEditor
        element={element}
        onCommit={onCommit}
        onCancel={onCancel}
        onEditorReady={onTextEditorReady}
        commitGuardRef={textCommitGuardRef}
      />
    );
  }

  if (isFrameElement(element)) {
    return (
      <FrameTitleEditor
        element={element}
        onCommit={onCommit}
        onCancel={onCancel}
        onEditorReady={onTextEditorReady}
        commitGuardRef={textCommitGuardRef}
      />
    );
  }

  if (isLinkElement(element)) {
    return (
      <LinkFieldsEditor
        element={element}
        onCommit={onCommit}
        onCancel={onCancel}
        onEditorReady={onTextEditorReady}
        commitGuardRef={textCommitGuardRef}
      />
    );
  }

  return null;
}
