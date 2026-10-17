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

  it('ignores unknown editor nodes', () => {
    const json = {
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { textAlign: 'left' }, content: [{ type: 'text', text: 'ok' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'ignored' }] },
      ],
    };

    expect(editorJsonToDoc(json)).toEqual(richTextFromPlain('ok'));
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
      blocks: [{ type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'no align attr' }] }],
    });
  });
});
