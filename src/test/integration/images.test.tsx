import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ImageElement } from '../../domain/element';
import { installDragEventPolyfill } from '../fixtures/drag-event';
import { DEFAULT_CREDENTIALS, createAppHarness } from './harness';

function pngFile(name = 'diagram.png') {
  return new File([new Uint8Array([137, 80, 78, 71])], name, { type: 'image/png' });
}

async function openBoard() {
  const harness = createAppHarness();
  await harness.register(DEFAULT_CREDENTIALS);
  const workspace = await harness.createOwnerWorkspace('Image board');
  harness.render({ initialPath: `/workspaces/${workspace.id.value}` });

  await screen.findByRole('application', { name: 'Canvas' });

  return { harness, workspace };
}

describe('image elements', () => {
  beforeAll(() => {
    installDragEventPolyfill();

    if (!('setPointerCapture' in Element.prototype)) {
      Object.defineProperty(Element.prototype, 'setPointerCapture', {
        value: jest.fn(),
        configurable: true,
      });
      Object.defineProperty(Element.prototype, 'hasPointerCapture', {
        value: jest.fn().mockReturnValue(true),
        configurable: true,
      });
      Object.defineProperty(Element.prototype, 'releasePointerCapture', {
        value: jest.fn(),
        configurable: true,
      });
    }
  });

  it('uploads a file, creates an image element and persists it', async () => {
    const { harness, workspace } = await openBoard();
    const user = userEvent.setup();
    const file = pngFile();

    await user.upload(screen.getByTestId('image-file-input'), file);

    const image = await waitFor(async () => {
      const stored = await harness.elementRepository.listByWorkspace(workspace.id);
      const created = stored.find((element): element is ImageElement => element.type === 'image');

      expect(created).toBeDefined();
      return created as ImageElement;
    });

    expect(image.alt).toBe('diagram');
    expect(image.storagePath).toBe(`workspaces/${workspace.id.value}/images/image-1-diagram.png`);
    expect(image.src).toBe(`https://storage.test/${image.storagePath}`);
    expect(harness.imageStoragePort.uploads).toHaveLength(1);

    const item = screen.getByTestId(`canvas-item-${image.id.value}`);
    expect(item).toHaveAttribute('data-element-type', 'image');
    expect(item).toHaveAttribute('data-selected', 'true');
    expect(screen.getByRole('img', { name: 'diagram' })).toHaveAttribute('src', image.src);
  });

  it('shows a clear error and does not upload unsupported files', async () => {
    const { harness } = await openBoard();
    const input = screen.getByTestId('image-file-input');
    const file = new File(['pdf'], 'document.pdf', { type: 'application/pdf' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText('Choose a PNG, JPEG, WebP or GIF image.')).toBeInTheDocument();
    expect(harness.imageStoragePort.uploads).toHaveLength(0);
  });

  it('creates the image at the drop position from a dropped file', async () => {
    const { harness, workspace } = await openBoard();
    const canvas = screen.getByRole('application', { name: 'Canvas' });
    const file = pngFile('dropped.png');
    const dataTransfer = {
      files: [file],
      types: ['Files'],
      items: [{ kind: 'file', type: file.type, getAsFile: () => file }],
      dropEffect: 'none',
      effectAllowed: 'all',
      setData: jest.fn(),
      getData: jest.fn(),
      clearData: jest.fn(),
      setDragImage: jest.fn(),
    } as unknown as DataTransfer;

    fireEvent.dragEnter(canvas, { dataTransfer });

    expect(await screen.findByTestId('canvas-drop-overlay')).toBeInTheDocument();

    fireEvent.drop(canvas, { dataTransfer, clientX: 600, clientY: 450 });

    const image = await waitFor(async () => {
      const stored = await harness.elementRepository.listByWorkspace(workspace.id);
      const created = stored.find((element): element is ImageElement => element.type === 'image');

      expect(created).toBeDefined();
      return created as ImageElement;
    });

    expect(image.alt).toBe('dropped');
    expect(image.position.x).toBe(440);
    expect(image.position.y).toBe(350);
    expect(harness.imageStoragePort.uploads).toHaveLength(1);
    expect(screen.queryByTestId('canvas-drop-overlay')).not.toBeInTheDocument();
  });
});
