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
import {
  applyFormatToEditor,
  getEditorFormatState,
} from '../../../../../presentation/canvas/text-format/editor-format';

function createEditor(content?: object): Editor {
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
    content,
    autofocus: false,
    editable: true,
  });
}

describe('editor-format', () => {
  afterEach(() => {
    // Each test owns its editor instance and must clean it up to avoid leaking
    // ProseMirror state between runs.
  });

  it('toggles bold', () => {
    const editor = createEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    });

    editor.commands.selectAll();

    expect(getEditorFormatState(editor).bold).toBe('off');

    applyFormatToEditor(editor, { kind: 'toggleMark', mark: 'bold' });

    expect(getEditorFormatState(editor).bold).toBe('on');

    editor.destroy();
  });

  it('applies color', () => {
    const editor = createEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    });

    editor.commands.selectAll();
    applyFormatToEditor(editor, { kind: 'color', value: '#ff0000' });

    expect(getEditorFormatState(editor).color).toBe('#ff0000');

    editor.destroy();
  });

  it('applies font family and size', () => {
    const editor = createEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    });

    editor.commands.selectAll();
    applyFormatToEditor(editor, { kind: 'fontFamily', value: 'arial' });
    applyFormatToEditor(editor, { kind: 'fontSize', value: 24 });

    const state = getEditorFormatState(editor);
    expect(state.fontFamily).toBe('arial');
    expect(state.fontSize).toBe(24);

    editor.destroy();
  });

  it('applies alignment', () => {
    const editor = createEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    });

    editor.commands.selectAll();
    applyFormatToEditor(editor, { kind: 'align', value: 'center' });

    expect(getEditorFormatState(editor).align).toBe('center');

    editor.destroy();
  });

  it('defaults marks to off and alignment to left when nothing is applied', () => {
    const editor = createEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'plain' }] }],
    });

    editor.commands.selectAll();

    expect(getEditorFormatState(editor)).toEqual({
      bold: 'off',
      underline: 'off',
      strikethrough: 'off',
      align: 'left',
    });

    editor.destroy();
  });
});
