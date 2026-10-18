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
      heading: 'off',
      bulletList: 'off',
      orderedList: 'off',
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

  it('steps font size up and down on the document', () => {
    const input = doc('hello');
    const state = getTextFormatState(input);

    const bigger = applyFormatToDocument(input, { kind: 'increaseFontSize' }, state);
    expect(getTextFormatState(bigger).fontSize).toBe(16);

    const smaller = applyFormatToDocument(bigger, { kind: 'decreaseFontSize' }, state);
    expect(getTextFormatState(smaller).fontSize).toBe(14);
  });

  it('applies and removes headings on the document', () => {
    const input = doc('hello');
    const state = getTextFormatState(input);

    const headed = applyFormatToDocument(input, { kind: 'heading', level: 1 }, state);
    expect(getTextFormatState(headed).heading).toBe(1);

    const plain = applyFormatToDocument(headed, { kind: 'heading', level: null }, state);
    expect(getTextFormatState(plain).heading).toBe('off');
  });

  it('applies and removes lists on the document', () => {
    const input = doc('hello');
    const state = getTextFormatState(input);

    const bulleted = applyFormatToDocument(input, { kind: 'list', value: 'bulletList' }, state);
    expect(getTextFormatState(bulleted).bulletList).toBe('on');

    const numbered = applyFormatToDocument(bulleted, { kind: 'list', value: 'orderedList' }, state);
    expect(getTextFormatState(numbered).orderedList).toBe('on');
    expect(getTextFormatState(numbered).bulletList).toBe('off');

    const plain = applyFormatToDocument(numbered, { kind: 'list', value: null }, state);
    expect(getTextFormatState(plain).orderedList).toBe('off');
    expect(plain.blocks[0]?.type).toBe('paragraph');
  });
});
