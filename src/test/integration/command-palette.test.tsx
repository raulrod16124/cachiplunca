import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createNoteElement } from '../../domain/element';
import { ElementId, Position, Size, UserId } from '../../domain/shared';
import { DEFAULT_CREDENTIALS, createAppHarness } from './harness';

async function openCommandPalette() {
  fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

  return screen.findByRole('combobox', { name: 'Search commands' });
}

describe('command palette', () => {
  beforeAll(() => {
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

  it('creates a task, undoes and redoes it from the board palette', async () => {
    const harness = createAppHarness();
    await harness.register(DEFAULT_CREDENTIALS);
    const workspace = await harness.createOwnerWorkspace('Roadmap Q4');
    const user = userEvent.setup();

    harness.render({ initialPath: `/workspaces/${workspace.id.value}` });
    await screen.findByRole('application', { name: 'Canvas' });

    const input = await openCommandPalette();
    await user.type(input, 'add task');
    await user.click(await screen.findByTestId('command-palette-item-create-task'));

    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Plan launch' },
    });
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(await screen.findByTestId('canvas-item-el-1')).toBeInTheDocument();

    await openCommandPalette();
    await user.click(await screen.findByTestId('command-palette-item-undo'));
    await waitFor(() => expect(screen.queryByTestId('canvas-item-el-1')).not.toBeInTheDocument());

    await openCommandPalette();
    await user.click(await screen.findByTestId('command-palette-item-redo'));
    expect(await screen.findByTestId('canvas-item-el-1')).toBeInTheDocument();
  });

  it('finds and selects a board element by its text', async () => {
    const harness = createAppHarness();
    await harness.register(DEFAULT_CREDENTIALS);
    const workspace = await harness.createOwnerWorkspace('Search board');

    await harness.elementRepository.save(
      createNoteElement({
        id: ElementId.create('note-1'),
        workspaceId: workspace.id,
        createdBy: UserId.create(harness.currentUser?.uid ?? 'user-1'),
        position: Position.create(120, 80),
        size: Size.create(200, 160),
        content: 'Launch checklist',
      }),
    );

    harness.render({ initialPath: `/workspaces/${workspace.id.value}` });
    await screen.findByRole('application', { name: 'Canvas' });
    await screen.findByTestId('canvas-item-note-1');

    const user = userEvent.setup();
    const input = await openCommandPalette();
    await user.type(input, 'launch checklist');

    const result = await screen.findByTestId('command-palette-item-element-note-1');
    await user.click(result);

    await waitFor(() =>
      expect(screen.getByTestId('canvas-item-note-1')).toHaveAttribute('data-selected', 'true'),
    );
  });

  it('connects exactly two selected elements from the board palette', async () => {
    const harness = createAppHarness();
    await harness.register(DEFAULT_CREDENTIALS);
    const workspace = await harness.createOwnerWorkspace('Connector board');
    const createdBy = UserId.create(harness.currentUser?.uid ?? 'user-1');

    await harness.elementRepository.save(
      createNoteElement({
        id: ElementId.create('a'),
        workspaceId: workspace.id,
        createdBy,
        position: Position.create(0, 0),
        size: Size.create(100, 100),
        content: 'A',
      }),
    );
    await harness.elementRepository.save(
      createNoteElement({
        id: ElementId.create('b'),
        workspaceId: workspace.id,
        createdBy,
        position: Position.create(300, 0),
        size: Size.create(100, 100),
        content: 'B',
      }),
    );

    harness.render({ initialPath: `/workspaces/${workspace.id.value}` });
    const canvas = await screen.findByRole('application', { name: 'Canvas' });
    await screen.findByTestId('canvas-item-a');
    await screen.findByTestId('canvas-item-b');

    fireEvent.keyDown(canvas, { key: 'a', ctrlKey: true });

    const user = userEvent.setup();
    const input = await openCommandPalette();
    await user.type(input, 'connect selected');
    await user.click(await screen.findByTestId('command-palette-item-create-connector-bound'));

    await waitFor(() => expect(screen.getAllByTestId(/^canvas-item-/)).toHaveLength(3));
  });

  it('opens the keyboard shortcuts help from the board palette', async () => {
    const harness = createAppHarness();
    await harness.register(DEFAULT_CREDENTIALS);
    const workspace = await harness.createOwnerWorkspace('Help board');
    const user = userEvent.setup();

    harness.render({ initialPath: `/workspaces/${workspace.id.value}` });
    await screen.findByRole('application', { name: 'Canvas' });

    await openCommandPalette();
    await user.click(await screen.findByTestId('command-palette-item-keyboard-shortcuts'));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Keyboard shortcuts' }),
    ).toBeInTheDocument();
  });

  it('navigates to another workspace from the board palette', async () => {
    const harness = createAppHarness();
    await harness.register(DEFAULT_CREDENTIALS);
    const workspace = await harness.createOwnerWorkspace('Roadmap Q4');
    const other = await harness.createOwnerWorkspace('Second plan');
    const user = userEvent.setup();

    harness.render({ initialPath: `/workspaces/${workspace.id.value}` });
    await screen.findByRole('application', { name: 'Canvas' });

    const input = await openCommandPalette();
    await user.type(input, 'second plan');
    await user.click(await screen.findByTestId(`command-palette-item-workspace-${other.id.value}`));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(`/workspaces/${other.id.value}`),
    );
    expect(await screen.findByRole('application', { name: 'Canvas' })).toBeInTheDocument();
  });

  it('creates a workspace and opens one by name from the workspaces page', async () => {
    const harness = createAppHarness();
    await harness.register(DEFAULT_CREDENTIALS);
    const workspace = await harness.createOwnerWorkspace('Roadmap Q4');
    const user = userEvent.setup();

    harness.render({ initialPath: '/workspaces' });
    await screen.findByRole('heading', { name: 'Your boards' });

    await openCommandPalette();
    await user.click(await screen.findByTestId('command-palette-item-create-workspace'));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Create board' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    const input = await openCommandPalette();
    await user.type(input, 'roadmap');
    await user.click(
      await screen.findByTestId(`command-palette-item-workspace-${workspace.id.value}`),
    );

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(`/workspaces/${workspace.id.value}`),
    );
  });
});
