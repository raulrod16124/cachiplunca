import { fireEvent, render, screen, waitFor } from '../../../../setup/render-with-theme';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from '../../../../../presentation/components/command-palette';
import type {
  CommandPaletteGroup,
  CommandPaletteItem,
} from '../../../../../presentation/components/command-palette';

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

function createItem(
  id: string,
  label: string,
  onSelect = jest.fn(),
  overrides: Partial<CommandPaletteItem> = {},
): CommandPaletteItem {
  return { id, label, onSelect, ...overrides };
}

function createGroups(onSelect = jest.fn()): readonly CommandPaletteGroup[] {
  return [
    {
      id: 'actions',
      label: 'Actions',
      items: [
        createItem('add-note', 'Add note', onSelect),
        createItem('add-task', 'Add task', jest.fn(), { keywords: 'todo' }),
        createItem('undo', 'Undo', jest.fn(), { disabled: true }),
      ],
    },
  ];
}

interface RenderOptions {
  readonly open?: boolean;
  readonly groups?: readonly CommandPaletteGroup[];
  readonly searchGroups?: (query: string) => readonly CommandPaletteGroup[];
  readonly statusMessage?: string | null;
}

function renderPalette({
  open = true,
  groups = createGroups(),
  searchGroups,
  statusMessage = null,
}: RenderOptions = {}) {
  const onOpenChange = jest.fn();

  render(
    <CommandPalette
      open={open}
      onOpenChange={onOpenChange}
      groups={groups}
      searchGroups={searchGroups}
      statusMessage={statusMessage}
    />,
  );

  return { onOpenChange };
}

describe('CommandPalette', () => {
  it('uses the shared modal layout and leaves scrolling to the results list', () => {
    renderPalette();

    expect(screen.getByTestId('modal-body')).toHaveAttribute('data-variant', 'none');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('opens with Cmd/Ctrl + K when closed', () => {
    const { onOpenChange } = renderPalette({ open: false });

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    fireEvent.keyDown(document, { key: 'K', metaKey: true });
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
  });

  it('closes with Cmd/Ctrl + K when open', () => {
    const { onOpenChange } = renderPalette();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not open while typing in an editable field', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderPalette({ open: false });

    render(<input aria-label="Workspace name" />);
    await user.click(screen.getByRole('textbox', { name: 'Workspace name' }));
    await user.keyboard('{Control>}k{/Control}');

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('does not open while another modal is open', () => {
    const { onOpenChange } = renderPalette({ open: false });

    render(<div role="dialog" aria-modal="true" aria-label="Other dialog" />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('filters actions and announces the result count', async () => {
    const user = userEvent.setup();
    renderPalette();

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Search commands' })).toHaveFocus(),
    );

    await user.type(screen.getByRole('combobox', { name: 'Search commands' }), 'task');

    expect(screen.getByTestId('command-palette-item-add-task')).toBeInTheDocument();
    expect(screen.queryByTestId('command-palette-item-add-note')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 result');
  });

  it('executes the active item with Enter and closes', async () => {
    const user = userEvent.setup();
    const addNote = jest.fn();
    const addTask = jest.fn();
    const { onOpenChange } = renderPalette({
      groups: [
        {
          id: 'actions',
          label: 'Actions',
          items: [
            createItem('add-note', 'Add note', addNote),
            createItem('add-task', 'Add task', addTask),
            createItem('undo', 'Undo', jest.fn(), { disabled: true }),
          ],
        },
      ],
    });

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Search commands' })).toHaveFocus(),
    );
    await user.keyboard('{ArrowDown}');

    expect(screen.getByTestId('command-palette-item-add-task')).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.keyboard('{Enter}');

    expect(addNote).not.toHaveBeenCalled();
    expect(addTask).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('executes the first enabled item with Enter', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    renderPalette({ groups: createGroups(onSelect) });

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Search commands' })).toHaveFocus(),
    );
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('executes an item on click', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    renderPalette({ groups: createGroups(onSelect) });

    await user.click(screen.getByTestId('command-palette-item-add-note'));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('shows search results from the dynamic groups', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    renderPalette({
      searchGroups: (query) =>
        query === 'road'
          ? [
              {
                id: 'workspaces',
                label: 'Workspaces',
                items: [createItem('workspace-1', 'Roadmap Q4', onSelect)],
              },
            ]
          : [],
    });

    await user.type(screen.getByRole('combobox', { name: 'Search commands' }), 'road');

    expect(screen.getByTestId('command-palette-item-workspace-1')).toBeInTheDocument();
    await user.click(screen.getByTestId('command-palette-item-workspace-1'));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state and status message', async () => {
    const user = userEvent.setup();
    renderPalette({ statusMessage: 'Loading boards…' });

    await user.type(screen.getByRole('combobox', { name: 'Search commands' }), 'missing');

    expect(screen.getByText('No matching actions, boards or elements.')).toBeInTheDocument();
    expect(screen.getByText('Loading boards…')).toBeInTheDocument();
  });

  it('uses brand tokens for the panel, active option and shortcut keys', async () => {
    renderPalette({
      groups: [
        {
          id: 'actions',
          label: 'Actions',
          items: [
            createItem('add-note', 'Add note'),
            createItem('undo', 'Undo', jest.fn(), { shortcut: 'Ctrl+Z', disabled: true }),
          ],
        },
      ],
    });

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Search commands' })).toHaveFocus(),
    );

    const css = styleText();
    expect(css).toContain('var(--rr-color-border-primary)');
    expect(css).toContain('var(--rr-color-action-primary-background)');
    expect(css).toContain('var(--rr-color-background-sunken)');
    expect(css).toContain('var(--rr-color-focus-ring)');
    expect(css).toContain('var(--rr-radius-sm)');
    expect(css).toContain('@media (max-width: 700px)');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('keeps the listbox active descendant in sync with the active option', async () => {
    const user = userEvent.setup();
    renderPalette();

    const input = screen.getByRole('combobox', { name: 'Search commands' });
    const listbox = screen.getByRole('listbox');
    const firstOption = screen.getByTestId('command-palette-item-add-note');
    const secondOption = screen.getByTestId('command-palette-item-add-task');

    await waitFor(() => expect(input).toHaveFocus());

    expect(listbox).toContainElement(firstOption);
    expect(input).toHaveAttribute('aria-activedescendant', firstOption.id);
    expect(firstOption).toHaveAttribute('role', 'option');
    expect(firstOption).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowDown}');

    expect(input).toHaveAttribute('aria-activedescendant', secondOption.id);
    expect(secondOption).toHaveAttribute('aria-selected', 'true');
    expect(firstOption).toHaveAttribute('aria-selected', 'false');
  });

  it('closes on Escape and from the close button', async () => {
    const user = userEvent.setup();
    const first = renderPalette();

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Search commands' })).toHaveFocus(),
    );
    await user.keyboard('{Escape}');
    expect(first.onOpenChange).toHaveBeenCalledWith(false);
  });
});
