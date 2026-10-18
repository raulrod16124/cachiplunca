import {
  DEFAULT_TEXT_ALIGN,
  RICH_TEXT_LIMITS,
  richTextFromPlain,
  richTextToPlain,
  isEmptyRichText,
  isSingleInlineBlockDocument,
  parseRichTextDocument,
  setDocumentBooleanMark,
  setDocumentColor,
  setDocumentFontFamily,
  setDocumentFontSize,
  setDocumentAlign,
  setDocumentHeading,
  setDocumentList,
  stepDocumentFontSize,
  validateTitleDocument,
  getDocumentBooleanMarkState,
  getDocumentColor,
  getDocumentFontFamily,
  getDocumentFontSize,
  getDocumentAlign,
  getDocumentHeadingState,
  getDocumentListState,
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
    const firstBlock = aligned.blocks[0];
    expect(firstBlock?.type === 'paragraph' ? firstBlock.align : null).toBe('center');
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

describe('extended blocks and marks', () => {
  it('parses a document with heading, bullet list and ordered list', () => {
    const input = {
      blocks: [
        { type: 'heading', level: 2, align: 'left', spans: [{ text: 'Title' }] },
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', align: 'left', spans: [{ text: 'a' }] }],
            },
          ],
        },
        {
          type: 'orderedList',
          items: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', align: 'left', spans: [{ text: 'b' }] }],
            },
          ],
        },
      ],
    };

    const parsed = parseRichTextDocument(input);

    expect(parsed.blocks.map((block) => block.type)).toEqual([
      'heading',
      'bulletList',
      'orderedList',
    ]);
  });

  it('rejects an unknown heading level', () => {
    expect(() =>
      parseRichTextDocument({
        blocks: [{ type: 'heading', level: 4, align: 'left', spans: [{ text: 'x' }] }],
      }),
    ).toThrow(/level/);
  });

  it('rejects an unknown block type', () => {
    expect(() =>
      parseRichTextDocument({
        blocks: [{ type: 'blockquote', align: 'left', spans: [{ text: 'x' }] }],
      }),
    ).toThrow(/paragraph, heading, bulletList or orderedList/);
  });

  it('rejects a non-boolean italic or highlight mark', () => {
    expect(() =>
      parseRichTextDocument({
        blocks: [
          { type: 'paragraph', align: 'left', spans: [{ text: 'x', marks: { italic: 'yes' } }] },
        ],
      }),
    ).toThrow(/"italic" must be a boolean/);

    expect(() =>
      parseRichTextDocument({
        blocks: [
          { type: 'paragraph', align: 'left', spans: [{ text: 'x', marks: { highlight: 1 } }] },
        ],
      }),
    ).toThrow(/"highlight" must be a boolean/);
  });

  it('flattens headings and lists to plain text', () => {
    const plain = richTextToPlain({
      blocks: [
        { type: 'heading', level: 1, align: 'left', spans: [{ text: 'H' }] },
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', align: 'left', spans: [{ text: 'one' }] }],
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', align: 'left', spans: [{ text: 'two' }] }],
            },
          ],
        },
      ],
    });

    expect(plain).toBe('H\none\ntwo');
  });

  it('toggles italic and highlight marks across every span', () => {
    const input = doc([{ text: 'a' }, { text: 'b' }]);

    const italicized = setDocumentBooleanMark(input, 'italic', true);
    expect(getDocumentBooleanMarkState(italicized, 'italic')).toBe('on');
    expect(getDocumentBooleanMarkState(input, 'italic')).toBe('off');

    const highlighted = setDocumentBooleanMark(input, 'highlight', true);
    expect(getDocumentBooleanMarkState(highlighted, 'highlight')).toBe('on');

    const cleared = setDocumentBooleanMark(italicized, 'italic', false);
    expect(getDocumentBooleanMarkState(cleared, 'italic')).toBe('off');
  });

  it('reports mixed italic state across spans', () => {
    const input: RichTextDocument = {
      blocks: [
        {
          type: 'paragraph',
          align: 'left',
          spans: [{ text: 'a', marks: { italic: true } }, { text: 'b' }],
        },
      ],
    };

    expect(getDocumentBooleanMarkState(input, 'italic')).toBe('mixed');
  });

  it('round-trips a document with extended blocks through parse', () => {
    const input: RichTextDocument = {
      blocks: [
        {
          type: 'heading',
          level: 3,
          align: 'center',
          spans: [{ text: 'Hi', marks: { italic: true, highlight: true } }],
        },
        {
          type: 'orderedList',
          items: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', align: 'left', spans: [{ text: 'item' }] }],
            },
          ],
        },
      ],
    };

    expect(parseRichTextDocument(input)).toEqual(input);
  });
});

describe('validateTitleDocument', () => {
  it('accepts a single paragraph block', () => {
    expect(() => validateTitleDocument(richTextFromPlain('ok'))).not.toThrow();
    expect(isSingleInlineBlockDocument(richTextFromPlain('ok'))).toBe(true);
  });

  it('accepts a single heading block', () => {
    const heading: RichTextDocument = {
      blocks: [{ type: 'heading', level: 1, align: 'left', spans: [{ text: 'Title' }] }],
    };

    expect(() => validateTitleDocument(heading)).not.toThrow();
    expect(isSingleInlineBlockDocument(heading)).toBe(true);
  });

  it('rejects a document with more than one block', () => {
    const multi: RichTextDocument = {
      blocks: [
        { type: 'paragraph', align: 'left', spans: [{ text: 'a' }] },
        { type: 'paragraph', align: 'left', spans: [{ text: 'b' }] },
      ],
    };

    expect(() => validateTitleDocument(multi)).toThrow(/exactly one block/);
    expect(isSingleInlineBlockDocument(multi)).toBe(false);
  });

  it('rejects a document whose single block is a list', () => {
    const list: RichTextDocument = {
      blocks: [
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', align: 'left', spans: [{ text: 'a' }] }],
            },
          ],
        },
      ],
    };

    expect(() => validateTitleDocument(list)).toThrow(/paragraph or heading/);
    expect(isSingleInlineBlockDocument(list)).toBe(false);
  });
});

describe('setDocumentHeading', () => {
  it('converts a paragraph to a heading preserving spans and align', () => {
    const input: RichTextDocument = {
      blocks: [{ type: 'paragraph', align: 'center', spans: [{ text: 'Title' }] }],
    };

    expect(setDocumentHeading(input, 2)).toEqual({
      blocks: [{ type: 'heading', level: 2, align: 'center', spans: [{ text: 'Title' }] }],
    });
  });

  it('converts a heading back to a paragraph with null', () => {
    const input: RichTextDocument = {
      blocks: [{ type: 'heading', level: 3, align: 'left', spans: [{ text: 'Title' }] }],
    };

    expect(setDocumentHeading(input, null)).toEqual({
      blocks: [{ type: 'paragraph', align: 'left', spans: [{ text: 'Title' }] }],
    });
  });

  it('changes an existing heading level', () => {
    const input: RichTextDocument = {
      blocks: [{ type: 'heading', level: 1, align: 'left', spans: [{ text: 'Title' }] }],
    };

    expect(setDocumentHeading(input, 3)).toEqual({
      blocks: [{ type: 'heading', level: 3, align: 'left', spans: [{ text: 'Title' }] }],
    });
  });

  it('applies headings inside list items', () => {
    const input: RichTextDocument = {
      blocks: [
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', align: 'left', spans: [{ text: 'item' }] }],
            },
          ],
        },
      ],
    };

    expect(setDocumentHeading(input, 1)).toEqual({
      blocks: [
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [{ type: 'heading', level: 1, align: 'left', spans: [{ text: 'item' }] }],
            },
          ],
        },
      ],
    });
  });
});

describe('setDocumentList', () => {
  it('merges consecutive paragraphs into a single bullet list', () => {
    const input: RichTextDocument = {
      blocks: [
        { type: 'paragraph', align: 'left', spans: [{ text: 'a' }] },
        { type: 'paragraph', align: 'left', spans: [{ text: 'b' }] },
      ],
    };

    expect(setDocumentList(input, 'bulletList')).toEqual({
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
      ],
    });
  });

  it('keeps a single list block for all top-level paragraphs', () => {
    const input: RichTextDocument = {
      blocks: [
        { type: 'paragraph', align: 'left', spans: [{ text: 'a' }] },
        { type: 'paragraph', align: 'left', spans: [{ text: 'b' }] },
        { type: 'paragraph', align: 'left', spans: [{ text: 'c' }] },
      ],
    };

    const output = setDocumentList(input, 'orderedList');

    expect(output.blocks).toHaveLength(1);
    const block = output.blocks[0];
    expect(block?.type).toBe('orderedList');
  });

  it('converts an existing bullet list to an ordered list', () => {
    const input: RichTextDocument = {
      blocks: [
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', align: 'left', spans: [{ text: 'a' }] }],
            },
          ],
        },
      ],
    };

    const output = setDocumentList(input, 'orderedList');

    expect(output.blocks[0]?.type).toBe('orderedList');
  });

  it('merges adjacent list blocks into one', () => {
    const item = (text: string) => ({
      type: 'listItem' as const,
      content: [{ type: 'paragraph' as const, align: 'left' as const, spans: [{ text }] }],
    });

    const input: RichTextDocument = {
      blocks: [
        { type: 'bulletList', items: [item('a')] },
        { type: 'bulletList', items: [item('b')] },
      ],
    };

    const output = setDocumentList(input, 'bulletList');

    expect(output.blocks).toHaveLength(1);
    const block = output.blocks[0];
    expect(block?.type).toBe('bulletList');
    expect(block?.type === 'bulletList' ? block.items : []).toHaveLength(2);
  });

  it('unwraps lists back to top-level blocks with null', () => {
    const input: RichTextDocument = {
      blocks: [
        { type: 'paragraph', align: 'left', spans: [{ text: 'before' }] },
        {
          type: 'orderedList',
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
      ],
    };

    expect(setDocumentList(input, null)).toEqual({
      blocks: [
        { type: 'paragraph', align: 'left', spans: [{ text: 'before' }] },
        { type: 'paragraph', align: 'left', spans: [{ text: 'a' }] },
        { type: 'paragraph', align: 'left', spans: [{ text: 'b' }] },
      ],
    });
  });

  it('converts nested lists of the same kind', () => {
    const input: RichTextDocument = {
      blocks: [
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', align: 'left', spans: [{ text: 'parent' }] },
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

    const output = setDocumentList(input, 'orderedList');
    const top = output.blocks[0];

    expect(top?.type).toBe('orderedList');
    if (top?.type !== 'bulletList' && top?.type !== 'orderedList') {
      throw new Error('expected a list block');
    }

    const nested = top.items[0]?.content.find((block) => block.type === 'orderedList');
    expect(nested).toBeDefined();
  });
});

describe('stepDocumentFontSize', () => {
  it('steps unset font size relative to the default', () => {
    const input = doc([{ text: 'hello' }]);

    expect(getDocumentFontSize(stepDocumentFontSize(input, 1))).toBe(16);
    expect(getDocumentFontSize(stepDocumentFontSize(input, -1))).toBe(12);
  });

  it('steps an existing font size', () => {
    const input = doc([{ text: 'hello' }]);
    const sized = setDocumentFontSize(input, 12);

    expect(getDocumentFontSize(stepDocumentFontSize(sized, 1))).toBe(14);
  });

  it('clamps at the extremes', () => {
    const maxSize = doc([{ text: 'hello' }]);
    const sizedMax = setDocumentFontSize(maxSize, 72);
    expect(getDocumentFontSize(stepDocumentFontSize(sizedMax, 1))).toBe(72);

    const minSized = setDocumentFontSize(maxSize, 8);
    expect(getDocumentFontSize(stepDocumentFontSize(minSized, -1))).toBe(8);
  });

  it('applies the stepped size to every span', () => {
    const input: RichTextDocument = {
      blocks: [
        {
          type: 'paragraph',
          align: 'left',
          spans: [{ text: 'a' }, { text: 'b' }],
        },
      ],
    };

    const stepped = stepDocumentFontSize(input, 1);

    for (const block of stepped.blocks) {
      if (block.type !== 'paragraph') {
        throw new Error('expected a paragraph');
      }
      for (const span of block.spans) {
        expect(span.marks?.fontSize).toBe(16);
      }
    }
  });
});

describe('getDocumentHeadingState', () => {
  it('reports off for paragraphs', () => {
    expect(getDocumentHeadingState(richTextFromPlain('plain'))).toBe('off');
  });

  it('reports the level for a uniform heading document', () => {
    const input: RichTextDocument = {
      blocks: [{ type: 'heading', level: 2, align: 'left', spans: [{ text: 'Title' }] }],
    };

    expect(getDocumentHeadingState(input)).toBe(2);
  });

  it('reports mixed for headings and paragraphs together', () => {
    const input: RichTextDocument = {
      blocks: [
        { type: 'heading', level: 1, align: 'left', spans: [{ text: 'a' }] },
        { type: 'paragraph', align: 'left', spans: [{ text: 'b' }] },
      ],
    };

    expect(getDocumentHeadingState(input)).toBe('mixed');
  });

  it('reports mixed for differing heading levels', () => {
    const input: RichTextDocument = {
      blocks: [
        { type: 'heading', level: 1, align: 'left', spans: [{ text: 'a' }] },
        { type: 'heading', level: 3, align: 'left', spans: [{ text: 'b' }] },
      ],
    };

    expect(getDocumentHeadingState(input)).toBe('mixed');
  });

  it('includes headings inside list items', () => {
    const input: RichTextDocument = {
      blocks: [
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [{ type: 'heading', level: 1, align: 'left', spans: [{ text: 'a' }] }],
            },
          ],
        },
      ],
    };

    expect(getDocumentHeadingState(input)).toBe(1);
  });
});

describe('getDocumentListState', () => {
  it('reports on for a single list kind', () => {
    const input: RichTextDocument = {
      blocks: [
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', align: 'left', spans: [{ text: 'a' }] }],
            },
          ],
        },
      ],
    };

    expect(getDocumentListState(input, 'bulletList')).toBe('on');
    expect(getDocumentListState(input, 'orderedList')).toBe('off');
  });

  it('reports off when the document has no lists', () => {
    expect(getDocumentListState(richTextFromPlain('plain'), 'bulletList')).toBe('off');
  });

  it('reports mixed when lists and paragraphs coexist', () => {
    const input: RichTextDocument = {
      blocks: [
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', align: 'left', spans: [{ text: 'a' }] }],
            },
          ],
        },
        { type: 'paragraph', align: 'left', spans: [{ text: 'b' }] },
      ],
    };

    expect(getDocumentListState(input, 'bulletList')).toBe('mixed');
  });
});
