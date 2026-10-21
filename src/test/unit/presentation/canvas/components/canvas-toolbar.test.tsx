import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { render } from '../../../../setup/render-with-theme';
import { CanvasToolbar } from '../../../../../presentation/canvas/components/canvas-toolbar';

type ToolbarProps = ComponentProps<typeof CanvasToolbar>;

function renderToolbar(overrides: Partial<ToolbarProps> = {}) {
  const onCreateElement = jest.fn();
  const onCreateConnector = jest.fn();
  const onDeleteSelection = jest.fn();
  const onFitView = jest.fn();
  const onAlign = jest.fn();
  const onDistribute = jest.fn();

  const props: ToolbarProps = {
    onCreateElement,
    onCreateConnector,
    onDeleteSelection,
    onFitView,
    onAlign,
    onDistribute,
    canCreate: true,
    canCreateFreeConnector: true,
    hasSelection: false,
    canCreateConnector: false,
    canAlign: false,
    canDistribute: false,
    ...overrides,
  };

  render(<CanvasToolbar {...props} />);

  return {
    onCreateElement,
    onCreateConnector,
    onDeleteSelection,
    onFitView,
    onAlign,
    onDistribute,
  };
}

describe('CanvasToolbar', () => {
  it('exposes an accessible toolbar', () => {
    renderToolbar();

    expect(screen.getByRole('toolbar', { name: 'Canvas toolbar' })).toBeInTheDocument();
  });

  it('uses icon buttons with accessible labels and ghost styling for creation tools', () => {
    renderToolbar();

    const addText = screen.getByRole('button', { name: 'Add text' });

    expect(addText).toHaveClass('rr-icon-button', 'rr-icon-button--ghost');
    expect(addText).toHaveAttribute('type', 'button');
  });

  it('creates each element type through its button', async () => {
    const user = userEvent.setup();
    const { onCreateElement } = renderToolbar();

    await user.click(screen.getByRole('button', { name: 'Add text' }));
    await user.click(screen.getByRole('button', { name: 'Add note' }));
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    await user.click(screen.getByRole('button', { name: 'Add frame' }));
    await user.click(screen.getByRole('button', { name: 'Add link' }));
    await user.click(screen.getByRole('button', { name: 'Add image' }));

    expect(onCreateElement.mock.calls.map(([type]) => type)).toEqual([
      'text',
      'note',
      'task',
      'frame',
      'link',
      'image',
    ]);
  });

  it('disables element creation when creation is not available', () => {
    renderToolbar({ canCreate: false });

    expect(screen.getByRole('button', { name: 'Add text' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add note' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add image' })).toBeDisabled();
  });

  it('adds a free connector through its own button', async () => {
    const user = userEvent.setup();
    const { onCreateConnector } = renderToolbar();

    await user.click(screen.getByRole('button', { name: 'Add connector' }));

    expect(onCreateConnector).toHaveBeenCalledWith('free');
  });

  it('connects the selected elements through its own button', async () => {
    const user = userEvent.setup();
    const { onCreateConnector } = renderToolbar({ canCreateConnector: true });

    const connector = screen.getByRole('button', { name: 'Connect selected elements' });
    expect(connector).toBeEnabled();

    await user.click(connector);

    expect(onCreateConnector).toHaveBeenCalledWith('bound');
  });

  it('disables the connector buttons when they are not available', () => {
    renderToolbar({ canCreateFreeConnector: false, canCreateConnector: false });

    expect(screen.getByRole('button', { name: 'Add connector' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Connect selected elements' })).toBeDisabled();
  });

  it('does not render undo and redo, which live in the viewport controls', () => {
    renderToolbar();

    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Redo' })).not.toBeInTheDocument();
  });

  it('disables delete without a selection and forwards it with one', async () => {
    const user = userEvent.setup();
    const { onDeleteSelection } = renderToolbar({ hasSelection: true });

    await user.click(screen.getByRole('button', { name: 'Delete selection' }));

    expect(onDeleteSelection).toHaveBeenCalledTimes(1);
  });

  it('disables delete when there is no selection', () => {
    renderToolbar({ hasSelection: false });

    expect(screen.getByRole('button', { name: 'Delete selection' })).toBeDisabled();
  });

  it('fits the view on demand', async () => {
    const user = userEvent.setup();
    const { onFitView } = renderToolbar();

    await user.click(screen.getByRole('button', { name: 'Fit view' }));

    expect(onFitView).toHaveBeenCalledTimes(1);
  });

  it('keeps a single tab stop and moves focus with arrows', async () => {
    const user = userEvent.setup();
    renderToolbar();

    const addText = screen.getByRole('button', { name: 'Add text' });
    const addNote = screen.getByRole('button', { name: 'Add note' });

    expect(addText).toHaveAttribute('tabindex', '0');
    expect(addNote).toHaveAttribute('tabindex', '-1');

    act(() => addText.focus());
    await user.keyboard('{ArrowRight}');

    expect(addNote).toHaveFocus();
    expect(addNote).toHaveAttribute('tabindex', '0');
  });

  it('places the tab stop on the first enabled control when creation is unavailable', () => {
    renderToolbar({ canCreate: false, canCreateFreeConnector: false });

    expect(screen.getByRole('button', { name: 'Fit view' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', { name: 'Add text' })).toBeDisabled();
  });

  it('does not let handled keys escape the toolbar', () => {
    renderToolbar();

    const onDocumentKeyDown = jest.fn();
    document.addEventListener('keydown', onDocumentKeyDown);

    const addText = screen.getByRole('button', { name: 'Add text' });
    act(() => addText.focus());
    fireEvent.keyDown(addText, { key: 'ArrowRight' });

    document.removeEventListener('keydown', onDocumentKeyDown);

    expect(onDocumentKeyDown).not.toHaveBeenCalled();
  });

  it('forwards alignment actions from the arrange menu', async () => {
    const user = userEvent.setup();
    const { onAlign } = renderToolbar({ canAlign: true });

    await user.click(screen.getByRole('button', { name: 'Align and distribute' }));
    await user.click(screen.getByRole('menuitem', { name: 'Align left' }));

    expect(onAlign).toHaveBeenCalledWith('left');
  });

  it('forwards distribution actions from the arrange menu', async () => {
    const user = userEvent.setup();
    const { onDistribute } = renderToolbar({ canAlign: true, canDistribute: true });

    await user.click(screen.getByRole('button', { name: 'Align and distribute' }));
    await user.click(screen.getByRole('menuitem', { name: 'Distribute horizontally' }));

    expect(onDistribute).toHaveBeenCalledWith('horizontal');
  });

  it('disables arrange when fewer than two elements are selected', () => {
    renderToolbar({ canAlign: false, canDistribute: false });

    expect(screen.getByRole('button', { name: 'Align and distribute' })).toBeDisabled();
  });

  it('disables distribution until three elements are selected', async () => {
    const user = userEvent.setup();
    renderToolbar({ canAlign: true, canDistribute: false });

    await user.click(screen.getByRole('button', { name: 'Align and distribute' }));

    expect(screen.getByRole('menuitem', { name: 'Distribute horizontally' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('menuitem', { name: 'Distribute vertically' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('omits the arrange menu when no handlers are provided', () => {
    renderToolbar({ onAlign: undefined, onDistribute: undefined });

    expect(screen.queryByRole('button', { name: 'Align and distribute' })).not.toBeInTheDocument();
  });
});
