import { fireEvent, screen, waitFor } from '@testing-library/react';
import { createAppHarness } from './harness';

describe('edit workspace flow', () => {
  it('updates the name and description from the workspace card', async () => {
    const harness = createAppHarness();
    await harness.register();
    const workspace = await harness.createOwnerWorkspace('Original board');

    harness.render({ initialPath: '/workspaces' });
    expect(
      await screen.findByRole('heading', { level: 3, name: 'Original board' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Original board' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed board' } });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Updated description' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Renamed board' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Updated description')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const stored = await harness.workspaceRepository.findById(workspace.id);
    await waitFor(() => {
      expect(stored?.name).toBe('Renamed board');
      expect(stored?.description).toBe('Updated description');
    });
  });
});
