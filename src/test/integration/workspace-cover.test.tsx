import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { createAppHarness } from './harness';

function coverFile(name = 'cover.png'): File {
  return new File([new Uint8Array([137, 80, 78, 71])], name, { type: 'image/png' });
}

describe('workspace cover flow', () => {
  it('creates a board with a cover, shows it in the list and top bar, then removes it', async () => {
    const harness = createAppHarness();
    await harness.register();
    harness.render({ initialPath: '/workspaces' });

    expect(await screen.findByRole('heading', { name: 'No boards yet' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Create board' })[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Covered board' } });
    fireEvent.change(screen.getByTestId('workspace-cover-input'), {
      target: { files: [coverFile()] },
    });
    expect(await screen.findByAltText('Cover image preview')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    const heading = await screen.findByRole('heading', { level: 3, name: 'Covered board' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(harness.imageStoragePort.uploads).toHaveLength(1));

    const [workspace] = await harness.workspaceRepository.list();
    expect(workspace.coverImageUrl).toBe(
      `https://storage.test/${harness.imageStoragePort.uploads[0].storagePath}`,
    );
    const card = heading.closest('article');
    expect(card).not.toBeNull();
    if (card !== null) {
      expect(within(card).getByTestId('workspace-cover-card')).toBeInTheDocument();
      expect(card.querySelector('img')).toHaveAttribute('src', workspace.coverImageUrl);
    }

    const openButton = card === null ? null : within(card).getByRole('button', { name: 'Open' });
    if (openButton !== null) {
      fireEvent.click(openButton);
    }
    expect(await screen.findByRole('application', { name: 'Canvas' })).toBeInTheDocument();
    expect(screen.getByTestId('workspace-cover-topbar').querySelector('img')).toHaveAttribute(
      'src',
      workspace.coverImageUrl,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back to boards' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Covered board' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove cover image' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(async () => {
      const stored = await harness.workspaceRepository.findById(workspace.id);
      expect(stored?.coverImageUrl).toBeNull();
      expect(stored?.coverImageStoragePath).toBeNull();
    });
    await waitFor(() => expect(harness.imageStoragePort.deletes).toHaveLength(1));
    expect(harness.imageStoragePort.deletes[0].storagePath).toBe(
      harness.imageStoragePort.uploads[0].storagePath,
    );
  });
});
