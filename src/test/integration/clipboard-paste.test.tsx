import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ImageElement, TextElement } from '../../domain/element';
import { richTextToPlain } from '../../domain/element';
import { DEFAULT_CREDENTIALS, createAppHarness } from './harness';

function pngFile(name = 'pasted.png') {
  return new File([new Uint8Array([137, 80, 78, 71])], name, { type: 'image/png' });
}

function clipboardData(files: readonly File[] = [], text = '') {
  return {
    files,
    getData: (format: string) => (format === 'text/plain' ? text : ''),
  };
}

async function openBoard() {
  const harness = createAppHarness();
  await harness.register(DEFAULT_CREDENTIALS);
  const workspace = await harness.createOwnerWorkspace('Clipboard board');
  harness.render({ initialPath: `/workspaces/${workspace.id.value}` });

  await screen.findByRole('application', { name: 'Canvas' });

  return { harness, workspace };
}

describe('clipboard paste', () => {
  it('creates and persists a text element from pasted plain text', async () => {
    const { harness, workspace } = await openBoard();
    const canvas = screen.getByRole('application', { name: 'Canvas' });

    fireEvent.paste(canvas, {
      clipboardData: clipboardData([], 'First line\nSecond line'),
    });

    const text = await waitFor(async () => {
      const stored = await harness.elementRepository.listByWorkspace(workspace.id);
      const created = stored.find((element): element is TextElement => element.type === 'text');

      expect(created).toBeDefined();
      return created as TextElement;
    });

    expect(richTextToPlain(text.content)).toBe('First line\nSecond line');
    expect(text.position.x).toBe(320);
    expect(text.position.y).toBe(280);
    expect(screen.getByTestId(`canvas-item-${text.id.value}`)).toHaveAttribute(
      'data-selected',
      'true',
    );
  });

  it('uploads and persists an image element from a pasted image file', async () => {
    const { harness, workspace } = await openBoard();
    const canvas = screen.getByRole('application', { name: 'Canvas' });
    const file = pngFile();

    fireEvent.paste(canvas, { clipboardData: clipboardData([file]) });

    const image = await waitFor(async () => {
      const stored = await harness.elementRepository.listByWorkspace(workspace.id);
      const created = stored.find((element): element is ImageElement => element.type === 'image');

      expect(created).toBeDefined();
      return created as ImageElement;
    });

    expect(image.alt).toBe('pasted');
    expect(image.position.x).toBe(240);
    expect(image.position.y).toBe(200);
    expect(harness.imageStoragePort.uploads).toHaveLength(1);
    expect(screen.getByTestId(`canvas-item-${image.id.value}`)).toHaveAttribute(
      'data-selected',
      'true',
    );
  });

  it('ignores an empty clipboard', async () => {
    const { harness, workspace } = await openBoard();
    const canvas = screen.getByRole('application', { name: 'Canvas' });

    fireEvent.paste(canvas, { clipboardData: clipboardData() });

    const stored = await harness.elementRepository.listByWorkspace(workspace.id);

    expect(stored).toHaveLength(0);
  });
});
