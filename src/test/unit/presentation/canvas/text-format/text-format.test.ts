import {
  applyFormatToDocument,
  getTextFormatState,
} from '../../../../../presentation/canvas/text-format/text-format';
import { richTextFromPlain } from '../../../../../domain/element/rich-text';
import type { RichTextDocument, RichTextSpan } from '../../../../../domain/element/rich-text';

function doc(text: string, overrides?: Partial<RichTextSpan>): RichTextDocument {
  return {
    blocks: [
      {
        type: 'paragraph',
        align: 'left',
        spans: [{ text, ...overrides }],
      },
    ],
  };
}

describe('text-format', () => {
  it('reads default state from a plain document', () => {
    const state = getTextFormatState(richTextFromPlain('plain'));

    expect(state).toEqual({
      bold: 'off',
      italic: 'off',
      underline: 'off',
      strikethrough: 'off',
      highlight: 'off',
      align: 'left',
    });
  });

  it('reads mixed mark state', () => {
    const input: RichTextDocument = {
      blocks: [
        {
          type: 'paragraph',
          align: 'left',
          spans: [{ text: 'a' }, { text: 'b', marks: { bold: true } }],
        },
      ],
    };

    const state = getTextFormatState(input);
    expect(state.bold).toBe('mixed');
  });

  it('toggles a mark based on current state', () => {
    const input = doc('hello');
    const state = getTextFormatState(input);

    const toggled = applyFormatToDocument(input, { kind: 'toggleMark', mark: 'bold' }, state);
    expect(getTextFormatState(toggled).bold).toBe('on');
  });

  it('applies style actions to the whole document', () => {
    const input = doc('hello');
    const state = getTextFormatState(input);

    const colored = applyFormatToDocument(input, { kind: 'color', value: '#00ff00' }, state);
    expect(getTextFormatState(colored).color).toBe('#00ff00');

    const aligned = applyFormatToDocument(colored, { kind: 'align', value: 'right' }, state);
    expect(getTextFormatState(aligned).align).toBe('right');
  });

  it('applies font actions to the whole document', () => {
    const input = doc('hello');
    const state = getTextFormatState(input);

    const styled = applyFormatToDocument(
      applyFormatToDocument(input, { kind: 'fontFamily', value: 'georgia' }, state),
      { kind: 'fontSize', value: 18 },
      state,
    );

    expect(getTextFormatState(styled)).toMatchObject({
      fontFamily: 'georgia',
      fontSize: 18,
    });
  });
});
