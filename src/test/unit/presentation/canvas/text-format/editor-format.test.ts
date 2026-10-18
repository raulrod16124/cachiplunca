import {
  applyFormatToEditor,
  getEditorFormatState,
} from '../../../../../presentation/canvas/text-format/editor-format';
import { createFormatTestEditor } from '../../../../fixtures/format-test-editor';

describe('editor-format', () => {
  afterEach(() => {
    // Each test owns its editor instance and must clean it up to avoid leaking
    // ProseMirror state between runs.
  });

  it('toggles bold', () => {
    const editor = createFormatTestEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    });

    editor.commands.selectAll();

    expect(getEditorFormatState(editor).bold).toBe('off');

    applyFormatToEditor(editor, { kind: 'toggleMark', mark: 'bold' });

    expect(getEditorFormatState(editor).bold).toBe('on');

    editor.destroy();
  });

  it('toggles italic and highlight', () => {
    const editor = createFormatTestEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    });

    editor.commands.selectAll();
    applyFormatToEditor(editor, { kind: 'toggleMark', mark: 'italic' });
    applyFormatToEditor(editor, { kind: 'toggleMark', mark: 'highlight' });

    const state = getEditorFormatState(editor);
    expect(state.italic).toBe('on');
    expect(state.highlight).toBe('on');

    editor.destroy();
  });

  it('reports mixed mark state for a partial selection', () => {
    const editor = createFormatTestEditor({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' plain' },
          ],
        },
      ],
    });

    editor.commands.selectAll();

    expect(getEditorFormatState(editor).bold).toBe('mixed');

    editor.destroy();
  });

  it('applies color', () => {
    const editor = createFormatTestEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    });

    editor.commands.selectAll();
    applyFormatToEditor(editor, { kind: 'color', value: '#ff0000' });

    expect(getEditorFormatState(editor).color).toBe('#ff0000');

    editor.destroy();
  });

  it('applies font family and size', () => {
    const editor = createFormatTestEditor({
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

  it('increases and decreases font size from the default', () => {
    const editor = createFormatTestEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    });

    editor.commands.selectAll();

    applyFormatToEditor(editor, { kind: 'increaseFontSize' });
    expect(getEditorFormatState(editor).fontSize).toBe(16);

    applyFormatToEditor(editor, { kind: 'decreaseFontSize' });
    expect(getEditorFormatState(editor).fontSize).toBe(14);

    editor.destroy();
  });

  it('applies alignment', () => {
    const editor = createFormatTestEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    });

    editor.commands.selectAll();
    applyFormatToEditor(editor, { kind: 'align', value: 'center' });

    expect(getEditorFormatState(editor).align).toBe('center');

    editor.destroy();
  });

  it('applies and removes headings', () => {
    const editor = createFormatTestEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    });

    editor.commands.selectAll();
    applyFormatToEditor(editor, { kind: 'heading', level: 1 });

    expect(getEditorFormatState(editor).heading).toBe(1);

    applyFormatToEditor(editor, { kind: 'heading', level: null });

    expect(getEditorFormatState(editor).heading).toBe('off');

    editor.destroy();
  });

  it('reports mixed heading state across blocks', () => {
    const editor = createFormatTestEditor({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'title' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'body' }] },
      ],
    });

    editor.commands.selectAll();

    expect(getEditorFormatState(editor).heading).toBe('mixed');

    editor.destroy();
  });

  it('toggles bullet and ordered lists and lifts out of them', () => {
    const editor = createFormatTestEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    });

    editor.commands.selectAll();
    applyFormatToEditor(editor, { kind: 'list', value: 'bulletList' });

    expect(getEditorFormatState(editor).bulletList).toBe('on');

    applyFormatToEditor(editor, { kind: 'list', value: 'orderedList' });

    let state = getEditorFormatState(editor);
    expect(state.bulletList).toBe('off');
    expect(state.orderedList).toBe('on');

    applyFormatToEditor(editor, { kind: 'list', value: null });

    state = getEditorFormatState(editor);
    expect(state.orderedList).toBe('off');
    expect(editor.getJSON().content?.[0]?.type).toBe('paragraph');

    editor.destroy();
  });

  it('reports mixed list state when the selection spans lists and paragraphs', () => {
    const editor = createFormatTestEditor({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item' }] }],
            },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'body' }] },
      ],
    });

    editor.commands.selectAll();

    expect(getEditorFormatState(editor).bulletList).toBe('mixed');

    editor.destroy();
  });

  it('defaults marks to off and alignment to left when nothing is applied', () => {
    const editor = createFormatTestEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'plain' }] }],
    });

    editor.commands.selectAll();

    expect(getEditorFormatState(editor)).toEqual({
      bold: 'off',
      italic: 'off',
      underline: 'off',
      strikethrough: 'off',
      highlight: 'off',
      align: 'left',
      heading: 'off',
      bulletList: 'off',
      orderedList: 'off',
    });

    editor.destroy();
  });

  it('applies highlight color and reports it in the state', () => {
    const editor = createFormatTestEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    });

    editor.commands.selectAll();
    applyFormatToEditor(editor, { kind: 'highlightColor', value: '#ffe119' });

    const state = getEditorFormatState(editor);
    expect(state.highlight).toBe('on');
    expect(state.highlightColor).toBe('#ffe119');

    editor.destroy();
  });

  it('removes highlight and highlight color with a null action', () => {
    const editor = createFormatTestEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    });

    editor.commands.selectAll();
    applyFormatToEditor(editor, { kind: 'highlightColor', value: '#ffe119' });
    applyFormatToEditor(editor, { kind: 'highlightColor', value: null });

    const state = getEditorFormatState(editor);
    expect(state.highlight).toBe('off');
    expect(state.highlightColor).toBeUndefined();

    editor.destroy();
  });
});
