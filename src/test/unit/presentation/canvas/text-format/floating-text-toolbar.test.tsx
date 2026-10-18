import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { FloatingTextToolbar } from '../../../../../presentation/canvas/text-format/floating-text-toolbar';
import type { TextFormatTarget } from '../../../../../presentation/canvas/text-format/text-format-target';
import type {
  TextFormatAction,
  TextFormatState,
} from '../../../../../presentation/canvas/text-format/text-format';

function initialState(overrides?: Partial<TextFormatState>): TextFormatState {
  return {
    bold: 'off',
    italic: 'off',
    underline: 'off',
    strikethrough: 'off',
    highlight: 'off',
    heading: 'off',
    bulletList: 'off',
    orderedList: 'off',
    ...overrides,
  };
}

interface MockTarget {
  readonly target: TextFormatTarget;
  readonly actions: TextFormatAction[];
  setState: (next: TextFormatState) => void;
}

function createMockTarget(
  initial: TextFormatState = initialState(),
  onApply?: (action: TextFormatAction, actions: TextFormatAction[]) => void,
): MockTarget {
  let state = initial;
  const actions: TextFormatAction[] = [];

  return {
    actions,
    target: {
      getState: () => state,
      applyAction: (action) => {
        actions.push(action);
        onApply?.(action, actions);
      },
    },
    setState: (next) => {
      state = next;
    },
  };
}
function setupScope(): { scope: HTMLElement; scopeRef: React.RefObject<HTMLElement | null> } {
  const scope = document.createElement('div');
  scope.textContent = 'hello world';
  document.body.append(scope);

  const scopeRef = createRef<HTMLElement | null>();
  (scopeRef as { current: HTMLElement | null }).current = scope;

  return { scope, scopeRef };
}

function selectAll(scope: HTMLElement): void {
  const selection = window.getSelection();

  if (selection === null) {
    throw new Error('selection unavailable');
  }

  const range = document.createRange();
  range.selectNodeContents(scope);
  selection.removeAllRanges();
  selection.addRange(range);
}

function openToolbar(scope: HTMLElement): void {
  selectAll(scope);
  fireEvent.contextMenu(scope);
}

describe('FloatingTextToolbar', () => {
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    document.body.innerHTML = '';
  });

  it('is hidden until a context menu opens on a selection', () => {
    const { scopeRef } = setupScope();
    const { target } = createMockTarget();

    render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} />);

    expect(screen.queryByTestId('floating-text-toolbar')).toBeNull();
  });

  it('opens on context menu over a selection and prevents the default menu', () => {
    const { scope, scopeRef } = setupScope();
    const { target } = createMockTarget();
    const onOpenChange = jest.fn();

    render(
      <FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} onOpenChange={onOpenChange} />,
    );

    selectAll(scope);

    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    const prevented = fireEvent(scope, event);

    expect(prevented).toBe(false);
    expect(screen.getByTestId('floating-text-toolbar')).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('does not open when there is no selection', () => {
    const { scope, scopeRef } = setupScope();
    const { target } = createMockTarget();

    render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} />);

    fireEvent.contextMenu(scope);

    expect(screen.queryByTestId('floating-text-toolbar')).toBeNull();
  });

  it('does not open when disabled', () => {
    const { scope, scopeRef } = setupScope();
    const { target } = createMockTarget();

    render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} enabled={false} />);

    openToolbar(scope);

    expect(screen.queryByTestId('floating-text-toolbar')).toBeNull();
  });

  it('applies a mark toggle from the toolbar', async () => {
    const user = userEvent.setup();
    const { scope, scopeRef } = setupScope();
    const { target, actions } = createMockTarget();

    render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} />);

    openToolbar(scope);

    await user.click(screen.getByRole('button', { name: 'Bold' }));

    expect(actions).toContainEqual({ kind: 'toggleMark', mark: 'bold' });
  });

  it('reflects the current state in the toggle buttons', () => {
    const { scope, scopeRef } = setupScope();
    const { target } = createMockTarget(initialState({ bold: 'on', italic: 'mixed' }));

    render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} />);

    openToolbar(scope);

    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute('data-mixed', 'true');
  });

  it('steps the font size from the plus and minus buttons', async () => {
    const user = userEvent.setup();
    const { scope, scopeRef } = setupScope();
    const { target, actions } = createMockTarget();

    render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} />);

    openToolbar(scope);

    await user.click(screen.getByRole('button', { name: 'Increase font size' }));
    await user.click(screen.getByRole('button', { name: 'Decrease font size' }));

    expect(actions).toContainEqual({ kind: 'increaseFontSize' });
    expect(actions).toContainEqual({ kind: 'decreaseFontSize' });
  });

  it('disables the text effects button', () => {
    const { scope, scopeRef } = setupScope();
    const { target } = createMockTarget();

    render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} />);

    openToolbar(scope);

    expect(screen.getByRole('button', { name: 'Text effects' })).toBeDisabled();
  });

  it('toggles lists', async () => {
    const user = userEvent.setup();
    const { scope, scopeRef } = setupScope();
    const { target, actions } = createMockTarget();

    render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} />);

    openToolbar(scope);

    await user.click(screen.getByRole('button', { name: 'Bulleted list' }));
    await user.click(screen.getByRole('button', { name: 'Numbered list' }));

    expect(actions).toContainEqual({ kind: 'list', value: 'bulletList' });
    expect(actions).toContainEqual({ kind: 'list', value: 'orderedList' });
  });

  it('arms and disarms the format painter', async () => {
    const user = userEvent.setup();
    const { scope, scopeRef } = setupScope();
    const { target } = createMockTarget(initialState({ bold: 'on' }));

    render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} />);

    openToolbar(scope);

    const painter = screen.getByRole('button', { name: 'Format painter' });
    expect(painter).toHaveAttribute('aria-pressed', 'false');

    await user.click(painter);
    expect(screen.getByRole('button', { name: 'Format painter' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Format painter' }));
    expect(screen.getByRole('button', { name: 'Format painter' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('picks a highlight color through the picker', async () => {
    const user = userEvent.setup();
    const { scope, scopeRef } = setupScope();
    const { target, actions } = createMockTarget();

    render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} />);

    openToolbar(scope);

    await user.click(screen.getByRole('button', { name: 'Highlight color options' }));
    await user.click(screen.getByRole('button', { name: 'Automatic' }));

    expect(actions).toContainEqual({ kind: 'highlightColor', value: null });
  });

  it('applies the default highlight color from the main button', async () => {
    const user = userEvent.setup();
    const { scope, scopeRef } = setupScope();
    const { target, actions } = createMockTarget();

    render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} />);

    openToolbar(scope);

    await user.click(screen.getByRole('button', { name: 'Highlight color' }));

    expect(actions).toContainEqual({ kind: 'highlightColor', value: '#ffe119' });
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const { scope, scopeRef } = setupScope();
    const { target } = createMockTarget();
    const onOpenChange = jest.fn();

    render(
      <FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} onOpenChange={onOpenChange} />,
    );

    openToolbar(scope);
    expect(screen.getByTestId('floating-text-toolbar')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByTestId('floating-text-toolbar')).toBeNull();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('closes on a mousedown outside the toolbar', () => {
    const { scope, scopeRef } = setupScope();
    const { target } = createMockTarget();
    const outside = document.createElement('div');
    document.body.append(outside);

    render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} />);

    openToolbar(scope);
    expect(screen.getByTestId('floating-text-toolbar')).toBeInTheDocument();

    fireEvent.mouseDown(outside);

    expect(screen.queryByTestId('floating-text-toolbar')).toBeNull();
  });

  it('closes when the selection collapses', () => {
    const { scope, scopeRef } = setupScope();
    const { target } = createMockTarget();

    render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} />);

    openToolbar(scope);
    expect(screen.getByTestId('floating-text-toolbar')).toBeInTheDocument();

    window.getSelection()?.removeAllRanges();
    fireEvent(document, new Event('selectionchange'));

    expect(screen.queryByTestId('floating-text-toolbar')).toBeNull();
  });

  it('stays open while a dropdown panel has focus', () => {
    const { scope, scopeRef } = setupScope();
    const { target } = createMockTarget();

    render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} />);

    openToolbar(scope);

    const fontButton = screen.getByRole('button', { name: 'Font' });
    fontButton.focus();

    window.getSelection()?.removeAllRanges();
    fireEvent(document, new Event('selectionchange'));

    expect(screen.getByTestId('floating-text-toolbar')).toBeInTheDocument();
  });

  it('closes when the format target becomes null', () => {
    const { scope, scopeRef } = setupScope();
    const { target } = createMockTarget();

    const { rerender } = render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} />);

    openToolbar(scope);
    expect(screen.getByTestId('floating-text-toolbar')).toBeInTheDocument();

    rerender(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={null} />);

    expect(screen.queryByTestId('floating-text-toolbar')).toBeNull();
  });

  it('re-reads state after applying an action', async () => {
    const user = userEvent.setup();
    const { scope, scopeRef } = setupScope();
    const mock = createMockTarget(initialState({ bold: 'off' }), (_action, applied) => {
      mock.setState(initialState({ bold: applied.length > 0 ? 'on' : 'off' }));
    });

    render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={mock.target} />);

    openToolbar(scope);

    await user.click(screen.getByRole('button', { name: 'Bold' }));

    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens the font family panel and applies a selection', async () => {
    const user = userEvent.setup();
    const { scope, scopeRef } = setupScope();
    const { target, actions } = createMockTarget();

    render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} />);

    openToolbar(scope);

    await user.click(screen.getByRole('button', { name: 'Font' }));
    await user.click(screen.getByRole('option', { name: 'Arial' }));

    expect(actions).toContainEqual({ kind: 'fontFamily', value: 'arial' });
  });

  it('applies a font size from the size input', async () => {
    const user = userEvent.setup();
    const { scope, scopeRef } = setupScope();
    const { target, actions } = createMockTarget();

    render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} />);

    openToolbar(scope);

    const input = screen.getByLabelText('Font size');
    await user.type(input, '18{Enter}');

    expect(actions).toContainEqual({ kind: 'fontSize', value: 18 });
  });

  it('opens the styles menu and applies a heading', async () => {
    const user = userEvent.setup();
    const { scope, scopeRef } = setupScope();
    const { target, actions } = createMockTarget();

    render(<FloatingTextToolbar scopeRef={scopeRef} formatTarget={target} />);

    openToolbar(scope);

    await user.click(screen.getByRole('button', { name: /Styles/ }));
    await user.click(screen.getByRole('option', { name: 'Heading 1' }));

    expect(actions).toContainEqual({ kind: 'heading', level: 1 });
  });
});
