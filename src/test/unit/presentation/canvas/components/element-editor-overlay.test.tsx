import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createFrameElement,
  createImageElement,
  createLinkElement,
  createNoteElement,
  createTextElement,
  richTextFromPlain,
} from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import { ElementEditorOverlay } from '../../../../../presentation/canvas/components/element-editor-overlay';
import { MESSAGES } from '../../../../../presentation/i18n';
import { localeWrapper } from '../../../../setup/locale-wrapper';

jest.mock('../../../../../presentation/canvas/components/rich-text-editor', () =>
  require('../../../../fixtures/rich-text-editor-stub'),
);

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');

function createText(content: string) {
  return createTextElement({
    id: ElementId.create('text-1'),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(10, 20),
    size: Size.create(160, 80),
    content,
  });
}

function createNote(content: string) {
  return createNoteElement({
    id: ElementId.create('note-1'),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(10, 20),
    size: Size.create(160, 80),
    content,
  });
}

function createFrame(title: string) {
  return createFrameElement({
    id: ElementId.create('frame-1'),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(10, 20),
    size: Size.create(240, 160),
    title,
  });
}

function createImage(alt?: string) {
  return createImageElement({
    id: ElementId.create('image-1'),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(10, 20),
    size: Size.create(320, 200),
    src: 'https://example.com/image.png',
    alt,
  });
}

function createLink(url: string, title?: string) {
  return createLinkElement({
    id: ElementId.create('link-1'),
    workspaceId: WORKSPACE_ID,
    createdBy: USER_ID,
    position: Position.create(10, 20),
    size: Size.create(240, 120),
    url,
    title,
  });
}

describe('ElementEditorOverlay', () => {
  describe('text', () => {
    it('starts with the current content and commits the draft on blur', async () => {
      const user = userEvent.setup();
      const element = createText('hello');
      const onCommit = jest.fn();
      const onCancel = jest.fn();

      render(<ElementEditorOverlay element={element} onCommit={onCommit} onCancel={onCancel} />);

      const editor = await screen.findByTestId('element-editor');
      expect(editor).toHaveValue('hello');

      await user.clear(editor);
      await user.type(editor, 'updated');
      await user.tab();

      expect(onCommit).toHaveBeenCalledWith({
        type: 'text',
        element,
        content: richTextFromPlain('updated'),
      });
    });

    it('cancels without committing when the content is unchanged', async () => {
      const user = userEvent.setup();
      const onCommit = jest.fn();
      const onCancel = jest.fn();

      render(
        <ElementEditorOverlay
          element={createText('hello')}
          onCommit={onCommit}
          onCancel={onCancel}
        />,
      );

      await screen.findByTestId('element-editor');
      await user.tab();

      expect(onCommit).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalled();
    });

    it('cancels on Escape without committing', async () => {
      const user = userEvent.setup();
      const onCommit = jest.fn();
      const onCancel = jest.fn();

      render(
        <ElementEditorOverlay
          element={createText('hello')}
          onCommit={onCommit}
          onCancel={onCancel}
        />,
      );

      const editor = await screen.findByTestId('element-editor');
      await user.clear(editor);
      await user.type(editor, 'discarded');
      await user.keyboard('{Escape}');

      expect(onCommit).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalled();
    });

    it('positions the editor over the element world bounds', async () => {
      render(
        <ElementEditorOverlay
          element={createText('hello')}
          onCommit={jest.fn()}
          onCancel={jest.fn()}
        />,
      );

      const editor = await screen.findByTestId('element-editor-box');
      expect(getComputedStyle(editor).position).toBe('absolute');
      expect(editor.style.left).toBe('10px');
      expect(editor.style.top).toBe('20px');
      expect(editor.style.width).toBe('160px');
      expect(editor.style.height).toBe('80px');
    });

    it('commits on Ctrl+Enter', async () => {
      const user = userEvent.setup();
      const element = createText('hello');
      const onCommit = jest.fn();
      const onCancel = jest.fn();

      render(<ElementEditorOverlay element={element} onCommit={onCommit} onCancel={onCancel} />);

      const editor = await screen.findByTestId('element-editor');
      await user.clear(editor);
      await user.type(editor, 'done');
      fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true });

      expect(onCommit).toHaveBeenCalledWith({
        type: 'text',
        element,
        content: richTextFromPlain('done'),
      });
    });
  });

  describe('note', () => {
    it('positions the editor over the element world bounds', () => {
      render(
        <ElementEditorOverlay
          element={createNote('a note')}
          onCommit={jest.fn()}
          onCancel={jest.fn()}
        />,
      );

      const editor = screen.getByTestId('element-editor-box');
      expect(getComputedStyle(editor).position).toBe('absolute');
      expect(editor.style.left).toBe('10px');
      expect(editor.style.top).toBe('20px');
    });

    it('commits the note content', async () => {
      const user = userEvent.setup();
      const element = createNote('');
      const onCommit = jest.fn();

      render(<ElementEditorOverlay element={element} onCommit={onCommit} onCancel={jest.fn()} />);

      await user.type(screen.getByTestId('element-editor'), 'a note');
      await user.tab();

      expect(onCommit).toHaveBeenCalledWith({
        type: 'note',
        element,
        content: richTextFromPlain('a note'),
      });
    });

    it('onEditorReady is invoked and commitGuardRef prevents commit on blur', async () => {
      const user = userEvent.setup();
      const onTextEditorReady = jest.fn();
      const textCommitGuardRef = { current: true };
      const onCommit = jest.fn();

      render(
        <ElementEditorOverlay
          element={createNote('')}
          onCommit={onCommit}
          onCancel={jest.fn()}
          onTextEditorReady={onTextEditorReady}
          textCommitGuardRef={textCommitGuardRef}
        />,
      );

      // onTextEditorReady should be invoked during mount (overlay forwards to onEditorReady in child)
      expect(onTextEditorReady).toHaveBeenCalled();

      await user.type(screen.getByTestId('element-editor'), 'a note');
      await user.tab();

      // commitGuardRef should prevent the commit (overlay forwards to commitGuardRef in child)
      expect(onCommit).not.toHaveBeenCalled();
    });
  });

  describe('frame', () => {
    it('edits the title', async () => {
      const user = userEvent.setup();
      const element = createFrame('Frame 1');
      const onCommit = jest.fn();

      render(<ElementEditorOverlay element={element} onCommit={onCommit} onCancel={jest.fn()} />);

      const title = screen.getByLabelText('Frame title');
      await user.clear(title);
      await user.type(title, 'Discovery');
      await user.tab();

      expect(onCommit).toHaveBeenCalledWith({
        type: 'frame',
        element,
        title: richTextFromPlain('Discovery'),
      });
    });

    it('onEditorReady is invoked and commitGuardRef prevents commit on blur', async () => {
      const user = userEvent.setup();
      const onTextEditorReady = jest.fn();
      const textCommitGuardRef = { current: true };
      const onCommit = jest.fn();

      render(
        <ElementEditorOverlay
          element={createFrame('Frame 1')}
          onCommit={onCommit}
          onCancel={jest.fn()}
          onTextEditorReady={onTextEditorReady}
          textCommitGuardRef={textCommitGuardRef}
        />,
      );

      expect(onTextEditorReady).toHaveBeenCalled();

      const title = screen.getByLabelText('Frame title');
      await user.clear(title);
      await user.type(title, 'Discovery');
      await user.tab();

      expect(onCommit).not.toHaveBeenCalled();
    });
  });

  describe('link', () => {
    it('uses the localized url placeholder', () => {
      const element = createLink('https://example.com', 'Example');

      render(<ElementEditorOverlay element={element} onCommit={jest.fn()} onCancel={jest.fn()} />);

      expect(screen.getByLabelText('Link URL')).toHaveAttribute(
        'placeholder',
        MESSAGES.en['canvas.linkUrlPlaceholder'],
      );
    });

    it('uses the Spanish url placeholder', () => {
      const element = createLink('https://example.com', 'Example');

      render(<ElementEditorOverlay element={element} onCommit={jest.fn()} onCancel={jest.fn()} />, {
        wrapper: localeWrapper('es'),
      });

      expect(screen.getByLabelText(MESSAGES.es['canvas.linkUrl'])).toHaveAttribute(
        'placeholder',
        MESSAGES.es['canvas.linkUrlPlaceholder'],
      );
    });

    it('commits both title and url', async () => {
      const user = userEvent.setup();
      const element = createLink('https://example.com', 'Example');
      const onCommit = jest.fn();

      render(<ElementEditorOverlay element={element} onCommit={onCommit} onCancel={jest.fn()} />);

      const title = screen.getByLabelText('Link title');
      const url = screen.getByLabelText('Link URL');

      await user.clear(url);
      await user.type(url, 'https://docs.example.com');
      await user.clear(title);
      await user.type(title, 'Docs');
      fireEvent.blur(title, { relatedTarget: null });

      expect(onCommit).toHaveBeenCalledWith({
        type: 'link',
        element,
        title: richTextFromPlain('Docs'),
        url: 'https://docs.example.com',
      });
    });

    it('does not commit while moving focus between its fields', async () => {
      const user = userEvent.setup();
      const onCommit = jest.fn();

      render(
        <ElementEditorOverlay
          element={createLink('https://example.com', 'Example')}
          onCommit={onCommit}
          onCancel={jest.fn()}
        />,
      );

      const title = screen.getByLabelText('Link title');
      await user.click(title);
      await user.tab();

      expect(onCommit).not.toHaveBeenCalled();
    });

    it('clears the title when emptied', async () => {
      const user = userEvent.setup();
      const element = createLink('https://example.com', 'Example');
      const onCommit = jest.fn();

      render(<ElementEditorOverlay element={element} onCommit={onCommit} onCancel={jest.fn()} />);

      const title = screen.getByLabelText('Link title');
      await user.clear(title);
      fireEvent.blur(title, { relatedTarget: null });

      expect(onCommit).toHaveBeenCalledWith({
        type: 'link',
        element,
        title: null,
        url: 'https://example.com',
      });
    });

    it('onEditorReady is invoked and commitGuardRef prevents commit on blur', async () => {
      const user = userEvent.setup();
      const onTextEditorReady = jest.fn();
      const textCommitGuardRef = { current: true };
      const onCommit = jest.fn();

      render(
        <ElementEditorOverlay
          element={createLink('https://example.com', 'Example')}
          onCommit={onCommit}
          onCancel={jest.fn()}
          onTextEditorReady={onTextEditorReady}
          textCommitGuardRef={textCommitGuardRef}
        />,
      );

      expect(onTextEditorReady).toHaveBeenCalled();

      const title = screen.getByLabelText('Link title');
      await user.clear(title);
      fireEvent.blur(title, { relatedTarget: null });

      // commitGuardRef should prevent the title commit
      expect(onCommit).not.toHaveBeenCalled();
    });
  });

  it('renders tokenized focus rings for raw editor fields', () => {
    render(
      <ElementEditorOverlay
        element={createLink('https://example.com', 'Example')}
        onCommit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(styleText()).toContain('var(--rr-color-focus-ring)');
  });

  describe('image', () => {
    it('edits the alt text and commits on Enter', async () => {
      const user = userEvent.setup();
      const element = createImage('Old description');
      const onCommit = jest.fn();

      render(<ElementEditorOverlay element={element} onCommit={onCommit} onCancel={jest.fn()} />);

      const field = screen.getByLabelText('Image description');
      expect(field).toHaveValue('Old description');
      expect(screen.getByRole('img', { name: 'Old description' })).toBeInTheDocument();

      await user.clear(field);
      await user.type(field, 'New description{Enter}');

      expect(onCommit).toHaveBeenCalledWith({
        type: 'image',
        element,
        alt: 'New description',
      });
    });

    it('clears the alt when emptied and cancels when unchanged', async () => {
      const user = userEvent.setup();
      const element = createImage('Description');
      const onCommit = jest.fn();

      render(<ElementEditorOverlay element={element} onCommit={onCommit} onCancel={jest.fn()} />);

      const field = screen.getByLabelText('Image description');
      await user.clear(field);
      fireEvent.blur(field, { relatedTarget: null });

      expect(onCommit).toHaveBeenCalledWith({ type: 'image', element, alt: null });
    });

    it('cancels without committing when the description is unchanged', async () => {
      const user = userEvent.setup();
      const onCommit = jest.fn();
      const onCancel = jest.fn();

      render(
        <ElementEditorOverlay
          element={createImage('Same')}
          onCommit={onCommit}
          onCancel={onCancel}
        />,
      );

      const field = screen.getByLabelText('Image description');
      await user.click(field);
      await user.keyboard('{Escape}');

      expect(onCommit).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalled();
    });
  });
});
