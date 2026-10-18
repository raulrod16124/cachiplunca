import {
  documentFormatTarget,
  editorFormatTarget,
} from '../../../../../presentation/canvas/text-format/text-format-target';
import { richTextFromPlain } from '../../../../../domain/element/rich-text';
import type { RichTextDocument } from '../../../../../domain/element/rich-text';
import { createFormatTestEditor } from '../../../../fixtures/format-test-editor';

describe('text-format-target', () => {
  it('exposes editor state and applies actions through the editor', () => {
    const editor = createFormatTestEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    });

    const target = editorFormatTarget(editor);

    expect(target.getState().bold).toBe('off');

    editor.commands.selectAll();
    target.applyAction({ kind: 'toggleMark', mark: 'bold' });

    expect(target.getState().bold).toBe('on');

    editor.destroy();
  });

  it('applies actions to the domain document and commits the result', () => {
    let doc: RichTextDocument | null = richTextFromPlain('hello');
    const commits: RichTextDocument[] = [];

    const target = documentFormatTarget({
      getDocument: () => doc,
      commitDocument: (next) => {
        doc = next;
        commits.push(next);
      },
    });

    target.applyAction({ kind: 'toggleMark', mark: 'bold' });

    expect(commits).toHaveLength(1);
    expect(target.getState().bold).toBe('on');

    target.applyAction({ kind: 'heading', level: 1 });
    expect(target.getState().heading).toBe(1);
  });

  it('ignores actions when there is no document', () => {
    const commits: RichTextDocument[] = [];

    const target = documentFormatTarget({
      getDocument: () => null,
      commitDocument: (next) => {
        commits.push(next);
      },
    });

    expect(target.getState().bold).toBe('off');
    target.applyAction({ kind: 'toggleMark', mark: 'bold' });

    expect(commits).toHaveLength(0);
  });

  it('does not commit no-op actions', () => {
    const doc = richTextFromPlain('hello');
    const commits: RichTextDocument[] = [];

    const target = documentFormatTarget({
      getDocument: () => doc,
      commitDocument: (next) => {
        commits.push(next);
      },
    });

    target.applyAction({ kind: 'align', value: 'left' });

    expect(commits).toHaveLength(0);
  });
});
