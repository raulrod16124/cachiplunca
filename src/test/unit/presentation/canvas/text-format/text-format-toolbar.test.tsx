import { Editor } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import History from '@tiptap/extension-history';
import Paragraph from '@tiptap/extension-paragraph';
import Strike from '@tiptap/extension-strike';
import Text from '@tiptap/extension-text';
import TextAlign from '@tiptap/extension-text-align';
import { Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getEditorFormatState } from '../../../../../presentation/canvas/text-format/editor-format';
import { TextFormatToolbar } from '../../../../../presentation/canvas/text-format/text-format-toolbar';

function createEditor(): Editor {
  return new Editor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Bold,
      Underline,
      Strike,
      History,
      TextStyle,
      Color,
      FontFamily,
      FontSize.configure({ types: ['textStyle'] }),
      TextAlign.configure({ types: ['paragraph'] }),
    ],
    content: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello world' }] }],
    },
    autofocus: false,
    editable: true,
  });
}

describe('TextFormatToolbar', () => {
  it('toggles bold', async () => {
    const user = userEvent.setup();
    const editor = createEditor();
    editor.commands.selectAll();

    render(<TextFormatToolbar editor={editor} />);

    expect(getEditorFormatState(editor).bold).toBe('off');

    await user.click(screen.getByRole('button', { name: 'Bold' }));

    expect(getEditorFormatState(editor).bold).toBe('on');

    editor.destroy();
  });

  it('applies color', async () => {
    const user = userEvent.setup();
    const editor = createEditor();
    editor.commands.selectAll();

    render(<TextFormatToolbar editor={editor} />);

    await user.click(screen.getByRole('button', { name: 'Text color #e6194b' }));

    expect(getEditorFormatState(editor).color).toBe('#e6194b');

    editor.destroy();
  });

  it('changes font size', async () => {
    const user = userEvent.setup();
    const editor = createEditor();
    editor.commands.selectAll();

    render(<TextFormatToolbar editor={editor} />);

    const sizeSelect = screen.getByRole('combobox', { name: 'Font size' });
    await user.selectOptions(sizeSelect, '24');

    expect(getEditorFormatState(editor).fontSize).toBe(24);

    editor.destroy();
  });

  it('changes alignment', async () => {
    const user = userEvent.setup();
    const editor = createEditor();
    editor.commands.selectAll();

    render(<TextFormatToolbar editor={editor} />);

    await user.click(screen.getByRole('button', { name: 'Align center' }));

    expect(getEditorFormatState(editor).align).toBe('center');

    editor.destroy();
  });
});
