import { createBrowserFileDownload } from '../../../../infrastructure/browser/browser-file-download';

describe('browser file download', () => {
  it('downloads a text file through an anchor and revokes the object URL', () => {
    const createObjectURL = jest.fn(() => 'blob:export');
    const revokeObjectURL = jest.fn();
    const click = jest.fn();
    const anchor = document.createElement('a');

    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });
    Object.defineProperty(anchor, 'click', {
      configurable: true,
      writable: true,
      value: click,
    });
    const createElement = jest
      .spyOn(document, 'createElement')
      .mockImplementationOnce(() => anchor);

    createBrowserFileDownload().downloadTextFile({
      fileName: 'roadmap-q4.json',
      content: '{"version":1}',
      mimeType: 'application/json',
    });

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(createElement).toHaveBeenCalledWith('a');
    expect(anchor.download).toBe('roadmap-q4.json');
    expect(anchor.href).toBe('blob:export');
    expect(anchor.rel).toBe('noopener');
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.body.contains(anchor)).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:export');

    createElement.mockRestore();
  });
});
