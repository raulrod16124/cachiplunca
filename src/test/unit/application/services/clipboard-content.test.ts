import { classifyClipboardPayload, type ClipboardDataLike } from '../../../../application/services';

function clipboardData(files: readonly File[] = [], text = ''): ClipboardDataLike {
  return {
    files,
    getData: (format) => (format === 'text/plain' ? text : ''),
  };
}

function imageFile(name = 'image.png', type = 'image/png'): File {
  return new File(['image'], name, { type });
}

describe('classifyClipboardPayload', () => {
  it('classifies a single image file', () => {
    const file = imageFile();

    expect(classifyClipboardPayload(clipboardData([file]))).toEqual({
      kind: 'image',
      file,
    });
  });

  it('classifies an image by file extension when the type is missing', () => {
    const file = imageFile('diagram.webp', '');

    expect(classifyClipboardPayload(clipboardData([file]))).toEqual({
      kind: 'image',
      file,
    });
  });

  it('prioritises an image over plain text', () => {
    const file = imageFile();

    const payload = classifyClipboardPayload(clipboardData([file], 'some text'));

    expect(payload.kind).toBe('image');
  });

  it('classifies plain text and preserves line breaks', () => {
    expect(classifyClipboardPayload(clipboardData([], 'Hello\nWorld'))).toEqual({
      kind: 'text',
      text: 'Hello\nWorld',
    });
  });

  it('ignores whitespace-only text', () => {
    expect(classifyClipboardPayload(clipboardData([], '   \n  '))).toEqual({
      kind: 'empty',
    });
  });

  it('classifies a non-image file without text as empty', () => {
    const file = new File(['pdf'], 'document.pdf', { type: 'application/pdf' });

    expect(classifyClipboardPayload(clipboardData([file]))).toEqual({ kind: 'empty' });
  });

  it('classifies a missing clipboard as empty', () => {
    expect(classifyClipboardPayload(null)).toEqual({ kind: 'empty' });
  });
});
