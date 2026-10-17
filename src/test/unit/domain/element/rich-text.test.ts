import {
  DEFAULT_TEXT_ALIGN,
  RICH_TEXT_LIMITS,
  richTextFromPlain,
  richTextToPlain,
  isEmptyRichText,
  parseRichTextDocument,
  setDocumentBooleanMark,
  setDocumentColor,
  setDocumentFontFamily,
  setDocumentFontSize,
  setDocumentAlign,
  getDocumentBooleanMarkState,
  getDocumentColor,
  getDocumentFontFamily,
  getDocumentFontSize,
  getDocumentAlign,
  type RichTextDocument,
  type RichTextMarks,
} from '../../../../domain/element/rich-text';

type MutableMarks = {
  -readonly [K in keyof RichTextMarks]?: RichTextMarks[K];
};

function doc(parts: { text: string; bold?: boolean; color?: string }[]): RichTextDocument {
  return {
    blocks: [
      {
        type: 'paragraph',
        align: DEFAULT_TEXT_ALIGN,
        spans: parts.map((part) => {
          const marks: MutableMarks = {};

          if (part.bold === true) {
            marks.bold = true;
          }

          if (part.color !== undefined) {
            marks.color = part.color;
          }

          return Object.keys(marks).length === 0 ? { text: part.text } : { text: part.text, marks };
        }),
      },
    ],
  };
}

describe('rich text helpers', () => {
  it('creates a document from plain text', () => {
    const result = richTextFromPlain('hello');

    expect(result).toEqual({
      blocks: [{ type: 'paragraph', align: 'left', spans: [{ text: 'hello' }] }],
    });
  });

  it('rejects non-string plain input', () => {
    expect(() => richTextFromPlain(123 as unknown as string)).toThrow(/string/);
  });

  it('represents an empty document with zero spans', () => {
    const result = richTextFromPlain('');

    expect(result).toEqual({
      blocks: [{ type: 'paragraph', align: 'left', spans: [] }],
    });
    expect(isEmptyRichText(result)).toBe(true);
  });

  it('flattens document text to plain', () => {
    const result = richTextToPlain({
      blocks: [
        { type: 'paragraph', align: 'left', spans: [{ text: 'ab' }, { text: 'c' }] },
        { type: 'paragraph', align: 'right', spans: [{ text: 'de' }] },
      ],
    });

    expect(result).toBe('abc\nde');
  });

  it('detects empty documents', () => {
    expect(isEmptyRichText(richTextFromPlain(''))).toBe(true);
    expect(isEmptyRichText(richTextFromPlain('   '))).toBe(true);
    expect(isEmptyRichText(richTextFromPlain('x'))).toBe(false);
    expect(isEmptyRichText(doc([{ text: '' }]))).toBe(true);
  });
});

describe('parseRichTextDocument', () => {
  it('round-trips a valid document', () => {
    const input = doc([{ text: 'hello', bold: true }]);

    expect(parseRichTextDocument(input)).toEqual(input);
  });

  it('rejects non-objects', () => {
    expect(() => parseRichTextDocument(null)).toThrow(/rich text document/);
    expect(() => parseRichTextDocument('text')).toThrow(/rich text document/);
  });

  it('rejects missing or empty blocks', () => {
    expect(() => parseRichTextDocument({})).toThrow(/blocks/);
    expect(() => parseRichTextDocument({ blocks: [] })).toThrow(/non-empty array/);
  });

  it('rejects invalid block align', () => {
    expect(() =>
      parseRichTextDocument({
        blocks: [{ type: 'paragraph', align: 'full', spans: [{ text: 'x' }] }],
      }),
    ).toThrow(/align/);
  });

  it('rejects spans without string text', () => {
    expect(() =>
      parseRichTextDocument({
        blocks: [{ type: 'paragraph', align: 'left', spans: [{ text: 1 }] }],
      }),
    ).toThrow(/string "text"/);
  });

  it('rejects invalid mark color', () => {
    expect(() =>
      parseRichTextDocument({
        blocks: [
          {
            type: 'paragraph',
            align: 'left',
            spans: [{ text: 'x', marks: { color: 'red' } }],
          },
        ],
      }),
    ).toThrow(/hex color/);
  });

  it('rejects unknown font family', () => {
    expect(() =>
      parseRichTextDocument({
        blocks: [
          {
            type: 'paragraph',
            align: 'left',
            spans: [{ text: 'x', marks: { fontFamily: 'comic' } }],
          },
        ],
      }),
    ).toThrow(/fontFamily/);
  });

  it('rejects unknown font size', () => {
    expect(() =>
      parseRichTextDocument({
        blocks: [
          {
            type: 'paragraph',
            align: 'left',
            spans: [{ text: 'x', marks: { fontSize: 13 } }],
          },
        ],
      }),
    ).toThrow(/fontSize/);
  });

  it('rejects too many blocks', () => {
    const blocks = Array.from({ length: RICH_TEXT_LIMITS.maxBlocks + 1 }, () => ({
      type: 'paragraph' as const,
      align: DEFAULT_TEXT_ALIGN,
      spans: [{ text: 'x' }],
    }));

    expect(() => parseRichTextDocument({ blocks })).toThrow(/blocks/);
  });

  it('rejects too many characters', () => {
    const spans = [{ text: 'x'.repeat(RICH_TEXT_LIMITS.maxTextLength + 1) }];

    expect(() =>
      parseRichTextDocument({
        blocks: [{ type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans }],
      }),
    ).toThrow(/characters/);
  });
});

describe('document formatting operations', () => {
  it('toggles boolean marks for every span', () => {
    const input = doc([{ text: 'a' }, { text: 'b', bold: true }]);

    const bolded = setDocumentBooleanMark(input, 'bold', true);
    expect(getDocumentBooleanMarkState(bolded, 'bold')).toBe('on');

    const cleared = setDocumentBooleanMark(input, 'bold', false);
    expect(getDocumentBooleanMarkState(cleared, 'bold')).toBe('off');
  });

  it('reports mixed boolean mark state', () => {
    const input = doc([{ text: 'a' }, { text: 'b', bold: true }]);

    expect(getDocumentBooleanMarkState(input, 'bold')).toBe('mixed');
  });

  it('applies and removes color', () => {
    const input = doc([{ text: 'a' }]);

    const colored = setDocumentColor(input, '#ff0000');
    expect(getDocumentColor(colored)).toBe('#ff0000');

    const cleared = setDocumentColor(colored, null);
    expect(getDocumentColor(cleared)).toBeUndefined();
  });

  it('rejects invalid color', () => {
    expect(() => setDocumentColor(richTextFromPlain('x'), 'red')).toThrow(/hex color/);
  });

  it('applies and removes font family', () => {
    const input = doc([{ text: 'a' }]);

    const styled = setDocumentFontFamily(input, 'courier');
    expect(getDocumentFontFamily(styled)).toBe('courier');

    const cleared = setDocumentFontFamily(styled, null);
    expect(getDocumentFontFamily(cleared)).toBeUndefined();
  });

  it('rejects unknown font family', () => {
    expect(() => setDocumentFontFamily(richTextFromPlain('x'), 'papyrus' as never)).toThrow(
      /Unknown text font family/,
    );
  });

  it('applies and removes font size', () => {
    const input = doc([{ text: 'a' }]);

    const sized = setDocumentFontSize(input, 24);
    expect(getDocumentFontSize(sized)).toBe(24);

    const cleared = setDocumentFontSize(sized, null);
    expect(getDocumentFontSize(cleared)).toBeUndefined();
  });

  it('rejects unknown font size', () => {
    expect(() => setDocumentFontSize(richTextFromPlain('x'), 13 as never)).toThrow(
      /Unknown text font size/,
    );
  });

  it('sets block alignment', () => {
    const input = richTextFromPlain('center me');

    const aligned = setDocumentAlign(input, 'center');
    expect(aligned.blocks[0]?.align).toBe('center');
    expect(getDocumentAlign(aligned)).toBe('center');
  });

  it('returns undefined alignment when blocks differ', () => {
    const input: RichTextDocument = {
      blocks: [
        { type: 'paragraph', align: 'left', spans: [{ text: 'a' }] },
        { type: 'paragraph', align: 'right', spans: [{ text: 'b' }] },
      ],
    };

    expect(getDocumentAlign(input)).toBeUndefined();
  });

  it('ignores empty spans when reading uniform values', () => {
    const input: RichTextDocument = {
      blocks: [
        {
          type: 'paragraph',
          align: 'left',
          spans: [{ text: '' }, { text: 'a', marks: { color: '#fff' } }],
        },
      ],
    };

    expect(getDocumentColor(input)).toBe('#fff');
  });
});
