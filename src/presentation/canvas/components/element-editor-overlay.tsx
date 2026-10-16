import type {
  CSSProperties,
  FocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
} from 'react';
import { useRef, useState } from 'react';
import styled from 'styled-components';
import type { UpdateElementInput } from '../../../application/commands';
import type {
  Element,
  FrameElement,
  LinkElement,
  NoteElement,
  TaskElement,
  TextElement,
} from '../../../domain/element';
import {
  isFrameElement,
  isLinkElement,
  isNoteElement,
  isTaskElement,
  isTextElement,
} from '../../../domain/element';

const EditorBox = styled.div`
  position: absolute;
  box-sizing: border-box;
  transform-origin: center center;
  outline: 1.5px solid ${({ theme }) => theme.canvas.selection};
  outline-offset: 0;
`;

const TextAreaBox = styled.textarea<{ $padding: string }>`
  position: absolute;
  transform-origin: center center;
  box-sizing: border-box;
  padding: ${({ $padding }) => $padding};
  border: 1.5px solid ${({ theme }) => theme.canvas.selection};
  border-radius: ${({ theme }) => theme.radius.sm};
  outline: none;
  resize: none;
  overflow: auto;
  user-select: text;
  caret-color: auto;
  color: ${({ theme }) => theme.color.text.primary};
  font-family: inherit;
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.4;
  background-color: ${({ theme }) => theme.canvas.surface};
  white-space: pre-wrap;
  overflow-wrap: break-word;
`;

const TitleField = styled.input`
  box-sizing: border-box;
  width: 100%;
  padding: 0;
  border: none;
  outline: none;
  user-select: text;
  caret-color: auto;
  color: ${({ theme }) => theme.color.text.primary};
  font-family: inherit;
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  line-height: 1.4;
  background: transparent;

  &::placeholder {
    color: ${({ theme }) => theme.color.text.muted};
    font-weight: ${({ theme }) => theme.font.weight.regular};
  }
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
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.canvas.surface};
`;

const FrameBox = styled(EditorBox)`
  display: flex;
  flex-direction: column;
  background-color: ${({ theme }) => theme.canvas.surfaceMuted};
`;

const FrameHeader = styled.div`
  padding: 8px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.canvas.elementBorder};
  background-color: ${({ theme }) => theme.canvas.surface};
`;

const LinkBox = styled(EditorBox)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.canvas.surface};
`;

export interface ElementEditorOverlayProps {
  readonly element: Element;
  readonly onCommit: (input: UpdateElementInput) => void;
  readonly onCancel: () => void;
}

type FieldEditorProps<TElement extends Element> = {
  readonly element: TElement;
  readonly onCommit: (input: UpdateElementInput) => void;
  readonly onCancel: () => void;
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

function selectAllOnFocus(event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void {
  event.currentTarget.select();
}

function isContainedFocus(event: FocusEvent<HTMLElement>, container: HTMLElement | null): boolean {
  return event.relatedTarget instanceof Node && container?.contains(event.relatedTarget) === true;
}

function TextContentEditor({
  element,
  onCommit,
  onCancel,
}: FieldEditorProps<TextElement>): ReactElement {
  const [draft, setDraft] = useState(element.content);
  const cancelledRef = useRef(false);

  const cancel = (): void => {
    cancelledRef.current = true;
    onCancel();
  };

  const commit = (): void => {
    if (cancelledRef.current) {
      return;
    }

    if (draft === element.content) {
      cancel();
      return;
    }

    onCommit({ type: 'text', element, content: draft });
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>): void => {
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

  return (
    <TextAreaBox
      $padding="8px"
      style={boxStyle(element)}
      data-testid="element-editor"
      data-editor-field="content"
      aria-label="Text content"
      autoFocus
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={selectAllOnFocus}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}

function NoteContentEditor({
  element,
  onCommit,
  onCancel,
}: FieldEditorProps<NoteElement>): ReactElement {
  const [draft, setDraft] = useState(element.content);
  const cancelledRef = useRef(false);

  const cancel = (): void => {
    cancelledRef.current = true;
    onCancel();
  };

  const commit = (): void => {
    if (cancelledRef.current) {
      return;
    }

    if (draft === element.content) {
      cancel();
      return;
    }

    onCommit({ type: 'note', element, content: draft });
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>): void => {
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

  return (
    <TextAreaBox
      $padding="12px"
      style={{
        ...boxStyle(element),
        ...(element.color === undefined ? {} : { backgroundColor: element.color }),
      }}
      data-testid="element-editor"
      data-editor-field="content"
      aria-label="Note content"
      autoFocus
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={selectAllOnFocus}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}

function TaskTitleEditor({
  element,
  onCommit,
  onCancel,
}: FieldEditorProps<TaskElement>): ReactElement {
  const [draft, setDraft] = useState(element.title);
  const cancelledRef = useRef(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const cancel = (): void => {
    cancelledRef.current = true;
    onCancel();
  };

  const commit = (): void => {
    if (cancelledRef.current) {
      return;
    }

    if (draft === element.title) {
      cancel();
      return;
    }

    onCommit({ type: 'task', element, title: draft });
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

  const handleBlur = (event: FocusEvent<HTMLInputElement>): void => {
    if (isContainedFocus(event, boxRef.current)) {
      return;
    }

    commit();
  };

  return (
    <TaskBox ref={boxRef} style={boxStyle(element)} data-testid="element-editor">
      <TitleField
        data-editor-field="title"
        aria-label="Task title"
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={selectAllOnFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </TaskBox>
  );
}

function FrameTitleEditor({
  element,
  onCommit,
  onCancel,
}: FieldEditorProps<FrameElement>): ReactElement {
  const [draft, setDraft] = useState(element.title);
  const cancelledRef = useRef(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const cancel = (): void => {
    cancelledRef.current = true;
    onCancel();
  };

  const commit = (): void => {
    if (cancelledRef.current) {
      return;
    }

    if (draft === element.title) {
      cancel();
      return;
    }

    onCommit({ type: 'frame', element, title: draft });
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

  const handleBlur = (event: FocusEvent<HTMLInputElement>): void => {
    if (isContainedFocus(event, boxRef.current)) {
      return;
    }

    commit();
  };

  return (
    <FrameBox ref={boxRef} style={boxStyle(element)} data-testid="element-editor">
      <FrameHeader>
        <TitleField
          data-editor-field="title"
          aria-label="Frame title"
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={selectAllOnFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      </FrameHeader>
    </FrameBox>
  );
}

function LinkFieldsEditor({
  element,
  onCommit,
  onCancel,
}: FieldEditorProps<LinkElement>): ReactElement {
  const [titleDraft, setTitleDraft] = useState(element.title ?? '');
  const [urlDraft, setUrlDraft] = useState(element.url);
  const cancelledRef = useRef(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const cancel = (): void => {
    cancelledRef.current = true;
    onCancel();
  };

  const commit = (): void => {
    if (cancelledRef.current) {
      return;
    }

    if (titleDraft === (element.title ?? '') && urlDraft === element.url) {
      cancel();
      return;
    }

    onCommit({
      type: 'link',
      element,
      title: titleDraft === '' ? null : titleDraft,
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

  const handleBlur = (event: FocusEvent<HTMLInputElement>): void => {
    if (isContainedFocus(event, boxRef.current)) {
      return;
    }

    commit();
  };

  return (
    <LinkBox ref={boxRef} style={boxStyle(element)} data-testid="element-editor">
      <TitleField
        data-editor-field="title"
        aria-label="Link title"
        placeholder="Title"
        value={titleDraft}
        onChange={(event) => setTitleDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      <UrlField
        data-editor-field="url"
        aria-label="Link URL"
        placeholder="https://example.com"
        autoFocus
        value={urlDraft}
        onChange={(event) => setUrlDraft(event.target.value)}
        onFocus={selectAllOnFocus}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    </LinkBox>
  );
}

export function ElementEditorOverlay({
  element,
  onCommit,
  onCancel,
}: ElementEditorOverlayProps): ReactElement | null {
  if (isTextElement(element)) {
    return <TextContentEditor element={element} onCommit={onCommit} onCancel={onCancel} />;
  }

  if (isNoteElement(element)) {
    return <NoteContentEditor element={element} onCommit={onCommit} onCancel={onCancel} />;
  }

  if (isTaskElement(element)) {
    return <TaskTitleEditor element={element} onCommit={onCommit} onCancel={onCancel} />;
  }

  if (isFrameElement(element)) {
    return <FrameTitleEditor element={element} onCommit={onCommit} onCancel={onCancel} />;
  }

  if (isLinkElement(element)) {
    return <LinkFieldsEditor element={element} onCommit={onCommit} onCancel={onCancel} />;
  }

  return null;
}
