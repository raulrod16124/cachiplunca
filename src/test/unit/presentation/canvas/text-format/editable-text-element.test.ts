import {
  createFrameElement,
  createLinkElement,
  createNoteElement,
  createTaskElement,
  createTextElement,
  richTextFromPlain,
} from '../../../../../domain/element';
import type { RichTextDocument } from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import {
  getEditableRichTextTarget,
  normalizeSingleLineDocument,
  toUpdateElementInput,
} from '../../../../../presentation/canvas/text-format/editable-text-element';

const WORKSPACE_ID = WorkspaceId.create('ws-1');
const USER_ID = UserId.create('user-1');

const base = {
  workspaceId: WORKSPACE_ID,
  createdBy: USER_ID,
  position: Position.create(0, 0),
  size: Size.create(100, 100),
};

function headingDocument(): RichTextDocument {
  return {
    blocks: [
      {
        type: 'heading',
        level: 2,
        align: 'center',
        spans: [{ text: 'Title', marks: { bold: true } }],
      },
    ],
  };
}

describe('editable-text-element', () => {
  it('resolves content targets for text and note', () => {
    const text = createTextElement({ ...base, id: ElementId.create('text'), content: 'hello' });
    const note = createNoteElement({ ...base, id: ElementId.create('note'), content: 'note' });

    expect(getEditableRichTextTarget(text)).toMatchObject({
      field: 'content',
      singleLine: false,
    });
    expect(getEditableRichTextTarget(note)).toMatchObject({
      field: 'content',
      singleLine: false,
    });
  });

  it('resolves single-line title targets for task, frame and link', () => {
    const task = createTaskElement({
      ...base,
      id: ElementId.create('task'),
      title: 'task',
      status: 'todo',
    });
    const frame = createFrameElement({ ...base, id: ElementId.create('frame'), title: 'frame' });
    const link = createLinkElement({
      ...base,
      id: ElementId.create('link'),
      url: 'https://example.com',
      title: 'link',
    });

    expect(getEditableRichTextTarget(task)).toMatchObject({ field: 'title', singleLine: true });
    expect(getEditableRichTextTarget(frame)).toMatchObject({ field: 'title', singleLine: true });
    expect(getEditableRichTextTarget(link)).toMatchObject({ field: 'title', singleLine: true });
  });

  it('uses an empty document for a link without title', () => {
    const link = createLinkElement({
      ...base,
      id: ElementId.create('link'),
      url: 'https://example.com',
    });

    expect(getEditableRichTextTarget(link)?.document).toEqual(richTextFromPlain(''));
  });

  it('maps documents to the matching update patch', () => {
    const task = createTaskElement({
      ...base,
      id: ElementId.create('task'),
      title: 'task',
      status: 'todo',
    });
    const target = getEditableRichTextTarget(task);
    const document = headingDocument();

    expect(target).not.toBeNull();
    expect(toUpdateElementInput(target!, document)).toEqual({
      type: 'task',
      element: task,
      title: document,
    });
  });

  it('clears a link title when the document is empty', () => {
    const link = createLinkElement({
      ...base,
      id: ElementId.create('link'),
      url: 'https://example.com',
      title: 'link',
    });
    const target = getEditableRichTextTarget(link);

    expect(target).not.toBeNull();
    expect(toUpdateElementInput(target!, richTextFromPlain(''))).toEqual({
      type: 'link',
      element: link,
      title: null,
    });
  });

  it('keeps an already single-line document unchanged', () => {
    const document = headingDocument();

    expect(normalizeSingleLineDocument(document)).toBe(document);
  });

  it('collapses multi-block documents to the first inline block', () => {
    const document: RichTextDocument = {
      blocks: [
        {
          type: 'paragraph',
          align: 'left',
          spans: [{ text: 'first' }],
        },
        {
          type: 'paragraph',
          align: 'left',
          spans: [{ text: 'second' }],
        },
      ],
    };

    expect(normalizeSingleLineDocument(document)).toEqual({
      blocks: [
        {
          type: 'paragraph',
          align: 'left',
          spans: [{ text: 'first' }],
        },
      ],
    });
  });

  it('extracts the first inline block from a list document', () => {
    const document: RichTextDocument = {
      blocks: [
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  align: 'left',
                  spans: [{ text: 'item', marks: { italic: true } }],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(normalizeSingleLineDocument(document)).toEqual({
      blocks: [
        {
          type: 'paragraph',
          align: 'left',
          spans: [{ text: 'item', marks: { italic: true } }],
        },
      ],
    });
  });
});
