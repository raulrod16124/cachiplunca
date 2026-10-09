import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement, type ReactNode } from 'react';
import {
  useSelectionKeyboard,
  type UseSelectionKeyboardOptions,
} from '../../../../../presentation/canvas/hooks/use-selection-keyboard';

interface KeyboardTestbenchProps extends UseSelectionKeyboardOptions {
  readonly children?: ReactNode;
}

function KeyboardTestbench({ children, ...options }: KeyboardTestbenchProps): ReactElement {
  const { ref } = useSelectionKeyboard(options);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      data-testid="keyboard-surface"
      role="application"
      aria-label="Canvas"
      tabIndex={0}
    >
      {children}
    </div>
  );
}

const ALL_IDS = ['first', 'second'] as const;

function renderKeyboard() {
  const onClear = jest.fn();
  const onSelectAll = jest.fn();

  const view = render(
    <KeyboardTestbench allIds={ALL_IDS} onClear={onClear} onSelectAll={onSelectAll} />,
  );

  return { onClear, onSelectAll, ...view };
}

describe('useSelectionKeyboard', () => {
  it('does not call any handler without a keydown', () => {
    const { onClear, onSelectAll } = renderKeyboard();

    expect(onClear).not.toHaveBeenCalled();
    expect(onSelectAll).not.toHaveBeenCalled();
  });

  it('clears the selection on Escape', async () => {
    const { onClear, onSelectAll } = renderKeyboard();
    const user = userEvent.setup();

    screen.getByTestId('keyboard-surface').focus();
    await user.keyboard('{Escape}');

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onSelectAll).not.toHaveBeenCalled();
  });

  it('selects all ids on Ctrl+A', async () => {
    const { onClear, onSelectAll } = renderKeyboard();
    const user = userEvent.setup();

    screen.getByTestId('keyboard-surface').focus();
    await user.keyboard('{Control>}a{/Control}');

    expect(onSelectAll).toHaveBeenCalledTimes(1);
    expect(onSelectAll).toHaveBeenCalledWith([...ALL_IDS]);
    expect(onClear).not.toHaveBeenCalled();
  });

  it('selects all ids on Cmd+A', async () => {
    const { onSelectAll } = renderKeyboard();
    const user = userEvent.setup();

    screen.getByTestId('keyboard-surface').focus();
    await user.keyboard('{Meta>}a{/Meta}');

    expect(onSelectAll).toHaveBeenCalledWith([...ALL_IDS]);
  });

  it('ignores unmapped keys', async () => {
    const { onClear, onSelectAll } = renderKeyboard();
    const user = userEvent.setup();

    screen.getByTestId('keyboard-surface').focus();
    await user.keyboard('x');

    expect(onClear).not.toHaveBeenCalled();
    expect(onSelectAll).not.toHaveBeenCalled();
  });

  it('ignores commands while an editable target is focused', async () => {
    const onClear = jest.fn();
    const onSelectAll = jest.fn();
    const user = userEvent.setup();

    render(
      <KeyboardTestbench allIds={ALL_IDS} onClear={onClear} onSelectAll={onSelectAll}>
        <input data-testid="editable" />
      </KeyboardTestbench>,
    );

    screen.getByTestId('editable').focus();
    await user.keyboard('{Escape}');
    await user.keyboard('{Control>}a{/Control}');

    expect(onClear).not.toHaveBeenCalled();
    expect(onSelectAll).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', async () => {
    const onClear = jest.fn();
    const onSelectAll = jest.fn();
    const user = userEvent.setup();

    render(
      <KeyboardTestbench allIds={ALL_IDS} onClear={onClear} onSelectAll={onSelectAll} disabled />,
    );

    screen.getByTestId('keyboard-surface').focus();
    await user.keyboard('{Escape}');
    await user.keyboard('{Control>}a{/Control}');

    expect(onClear).not.toHaveBeenCalled();
    expect(onSelectAll).not.toHaveBeenCalled();
  });

  it('prevents the default action for handled commands', () => {
    const { onClear } = renderKeyboard();
    const surface = screen.getByTestId('keyboard-surface');

    const notPrevented = fireEvent.keyDown(surface, { key: 'Escape' });

    expect(notPrevented).toBe(false);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('does not handle repeated keydowns', () => {
    const { onClear } = renderKeyboard();
    const surface = screen.getByTestId('keyboard-surface');

    fireEvent.keyDown(surface, { key: 'Escape' });
    fireEvent.keyDown(surface, { key: 'Escape', repeat: true });

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('removes the listener on unmount', () => {
    const { onClear, unmount } = renderKeyboard();
    const surface = screen.getByTestId('keyboard-surface');

    unmount();
    fireEvent.keyDown(surface, { key: 'Escape' });

    expect(onClear).not.toHaveBeenCalled();
  });
});
