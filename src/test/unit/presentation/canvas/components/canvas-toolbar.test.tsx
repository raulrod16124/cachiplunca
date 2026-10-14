import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { render } from '../../../../setup/render-with-theme';
import { CanvasToolbar } from '../../../../../presentation/canvas/components/canvas-toolbar';

type ToolbarProps = ComponentProps<typeof CanvasToolbar>;

function renderToolbar(overrides: Partial<ToolbarProps> = {}) {
  const onCreateElement = jest.fn();
  const onUndo = jest.fn();
  const onRedo = jest.fn();
  const onDeleteSelection = jest.fn();
  const onFitView = jest.fn();

  const props: ToolbarProps = {
    onCreateElement,
    onUndo,
    onRedo,
    onDeleteSelection,
    onFitView,
    canCreate: true,
    canUndo: false,
    canRedo: false,
    hasSelection: false,
    canCreateConnector: false,
    ...overrides,
  };

  render(<CanvasToolbar {...props} />);

  return { onCreateElement, onUndo, onRedo, onDeleteSelection, onFitView };
}

describe('CanvasToolbar', () => {
  it('exposes an accessible toolbar', () => {
    renderToolbar();

    expect(screen.getByRole('toolbar', { name: 'Canvas toolbar' })).toBeInTheDocument();
  });

  it('creates each element type through its button', async () => {
    const user = userEvent.setup();
    const { onCreateElement } = renderToolbar();

    await user.click(screen.getByRole('button', { name: 'Add text' }));
    await user.click(screen.getByRole('button', { name: 'Add note' }));
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    await user.click(screen.getByRole('button', { name: 'Add frame' }));
    await user.click(screen.getByRole('button', { name: 'Add link' }));

    expect(onCreateElement.mock.calls.map(([type]) => type)).toEqual([
      'text',
      'note',
      'task',
      'frame',
      'link',
    ]);
  });

  it('disables element creation when creation is not available', () => {
    renderToolbar({ canCreate: false });

    expect(screen.getByRole('button', { name: 'Add text' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add note' })).toBeDisabled();
  });

  it('only enables the connector button with exactly two selected elements', async () => {
    const user = userEvent.setup();
    const { onCreateElement } = renderToolbar({ canCreateConnector: true });

    const connector = screen.getByRole('button', { name: 'Connect selected elements' });
    expect(connector).toBeEnabled();

    await user.click(connector);

    expect(onCreateElement).toHaveBeenCalledWith('connector');
  });

  it('disables the connector button without a two-element selection', () => {
    renderToolbar({ canCreateConnector: false });

    expect(screen.getByRole('button', { name: 'Connect selected elements' })).toBeDisabled();
  });

  it('reflects undo and redo availability and forwards clicks', async () => {
    const user = userEvent.setup();
    const { onUndo, onRedo } = renderToolbar({ canUndo: true, canRedo: true });

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await user.click(screen.getByRole('button', { name: 'Redo' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('disables undo and redo when unavailable', () => {
    renderToolbar({ canUndo: false, canRedo: false });

    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
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
    renderToolbar({ canCreate: false });

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
});
