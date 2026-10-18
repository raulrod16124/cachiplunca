import {
  docToEditorJson,
  editorJsonToDoc,
} from '../../../../../presentation/canvas/text-format/rich-text-adapter';
import {
  DEFAULT_TEXT_ALIGN,
  richTextFromPlain,
  type RichTextDocument,
} from '../../../../../domain/element/rich-text';

function roundTrip(doc: RichTextDocument): RichTextDocument {
  return editorJsonToDoc(docToEditorJson(doc));
}

describe('rich-text-adapter', () => {
  it('round-trips a plain document', () => {
    const input = richTextFromPlain('Hello world');

    expect(roundTrip(input)).toEqual(input);
  });

  it('round-trips an empty document', () => {
    const input = richTextFromPlain('');

    expect(roundTrip(input)).toEqual(input);
  });

  it('round-trips marks', () => {
    const input: RichTextDocument = {
      blocks: [
        {
          type: 'paragraph',
          align: 'left',
          spans: [
            { text: 'bold ', marks: { bold: true } },
            { text: 'underline ', marks: { underline: true } },
            { text: 'strike', marks: { strikethrough: true } },
          ],
        },
      ],
    };

    expect(roundTrip(input)).toEqual(input);
  });

  it('round-trips style marks', () => {
    const input: RichTextDocument = {
      blocks: [
        {
          type: 'paragraph',
          align: 'left',
          spans: [
            {
              text: 'styled',
              marks: { color: '#ff0000', fontFamily: 'arial', fontSize: 24 },
            },
          ],
        },
      ],
    };

    expect(roundTrip(input)).toEqual(input);
  });

  it('round-trips alignment', () => {
    const input: RichTextDocument = {
      blocks: [
        { type: 'paragraph', align: 'center', spans: [{ text: 'centered' }] },
        { type: 'paragraph', align: 'justify', spans: [{ text: 'justified' }] },
      ],
    };

    expect(roundTrip(input)).toEqual(input);
  });

  it('round-trips italic and highlight marks', () => {
    const input: RichTextDocument = {
      blocks: [
        {
          type: 'paragraph',
          align: 'left',
          spans: [
            { text: 'italic ', marks: { italic: true } },
            { text: 'highlighted', marks: { highlight: true } },
          ],
        },
      ],
    };

    expect(roundTrip(input)).toEqual(input);
  });

  it('round-trips headings', () => {
    const input: RichTextDocument = {
      blocks: [
        { type: 'heading', level: 1, align: 'left', spans: [{ text: 'H1' }] },
        { type: 'heading', level: 3, align: 'center', spans: [{ text: 'H3' }] },
      ],
    };

    expect(roundTrip(input)).toEqual(input);
  });

  it('round-trips bullet and ordered lists', () => {
    const input: RichTextDocument = {
      blocks: [
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', align: 'left', spans: [{ text: 'a' }] }],
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', align: 'left', spans: [{ text: 'b' }] }],
            },
          ],
        },
        {
          type: 'orderedList',
          items: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', align: 'left', spans: [{ text: 'one' }] }],
            },
          ],
        },
      ],
    };

    expect(roundTrip(input)).toEqual(input);
  });

  it('round-trips nested lists and headings inside items', () => {
    const input: RichTextDocument = {
      blocks: [
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [
                { type: 'heading', level: 2, align: 'left', spans: [{ text: 'parent' }] },
                {
                  type: 'orderedList',
                  items: [
                    {
                      type: 'listItem',
                      content: [{ type: 'paragraph', align: 'left', spans: [{ text: 'child' }] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(roundTrip(input)).toEqual(input);
  });

  it('round-trips a mixed document', () => {
    const input: RichTextDocument = {
      blocks: [
        { type: 'heading', level: 1, align: 'left', spans: [{ text: 'Title' }] },
        { type: 'paragraph', align: 'left', spans: [{ text: 'intro' }] },
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', align: 'left', spans: [{ text: 'bullet' }] }],
            },
          ],
        },
      ],
    };

    expect(roundTrip(input)).toEqual(input);
  });

  it('ignores unknown editor nodes', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { textAlign: 'left' },
          content: [{ type: 'text', text: 'ok' }],
        },
        { type: 'horizontalRule' },
      ],
    };

    expect(editorJsonToDoc(json)).toEqual(richTextFromPlain('ok'));
  });

  it('skips lists whose items have no parseable content', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [{ type: 'listItem' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'ok' }],
        },
      ],
    };

    expect(editorJsonToDoc(json)).toEqual(richTextFromPlain('ok'));
  });

  it('defaults missing heading level to 1', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { textAlign: 'left' },
          content: [{ type: 'text', text: 'title' }],
        },
      ],
    };

    expect(editorJsonToDoc(json)).toEqual({
      blocks: [{ type: 'heading', level: 1, align: 'left', spans: [{ text: 'title' }] }],
    });
  });

  it('falls back to an empty document for null/undefined JSON', () => {
    expect(editorJsonToDoc(null)).toEqual(richTextFromPlain(''));
    expect(editorJsonToDoc(undefined)).toEqual(richTextFromPlain(''));
  });

  it('defaults missing alignment to left', () => {
    const json = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'no align attr' }] }],
    };

    expect(editorJsonToDoc(json)).toEqual({
      blocks: [
        { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'no align attr' }] },
      ],
    });
  });
});
