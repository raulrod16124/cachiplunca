import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement } from 'react';
import {
  useRovingFocus,
  type RovingOrientation,
} from '../../../../presentation/hooks/use-roving-focus';

interface ToolbarTestbenchProps {
  readonly orientation?: RovingOrientation;
  readonly disabled?: boolean;
  readonly disabledIndex?: number | null;
  readonly onBubbledKeyDown?: (key: string) => void;
}

const LABELS = ['One', 'Two', 'Three'] as const;

function ToolbarTestbench({
  orientation,
  disabled = false,
  disabledIndex = null,
  onBubbledKeyDown,
}: ToolbarTestbenchProps): ReactElement {
  const { ref } = useRovingFocus<HTMLDivElement>({ orientation, disabled });

  return (
    <div onKeyDown={(event) => onBubbledKeyDown?.(event.key)}>
      <div ref={ref} role="toolbar" aria-label="Toolbar">
        {LABELS.map((label, index) => (
          <button key={label} type="button" disabled={index === disabledIndex}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function getButton(label: string): HTMLElement {
  return screen.getByRole('button', { name: label });
}

describe('useRovingFocus', () => {
  it('keeps a single tab stop on the first enabled item', () => {
    render(<ToolbarTestbench disabledIndex={1} />);

    expect(getButton('One')).toHaveAttribute('tabindex', '0');
    expect(getButton('Two')).toBeDisabled();
    expect(getButton('Three')).toHaveAttribute('tabindex', '-1');
  });

  it('moves focus to the next enabled item on ArrowRight', async () => {
    render(<ToolbarTestbench disabledIndex={1} />);
    const user = userEvent.setup();

    getButton('One').focus();
    await user.keyboard('{ArrowRight}');

    expect(getButton('Three')).toHaveFocus();
    expect(getButton('Three')).toHaveAttribute('tabindex', '0');
    expect(getButton('One')).toHaveAttribute('tabindex', '-1');
  });

  it('wraps focus backwards on ArrowLeft', async () => {
    render(<ToolbarTestbench />);
    const user = userEvent.setup();

    getButton('One').focus();
    await user.keyboard('{ArrowLeft}');

    expect(getButton('Three')).toHaveFocus();
  });

  it('supports Home and End', async () => {
    render(<ToolbarTestbench />);
    const user = userEvent.setup();

    getButton('Two').focus();
    await user.keyboard('{End}');
    expect(getButton('Three')).toHaveFocus();

    await user.keyboard('{Home}');
    expect(getButton('One')).toHaveFocus();
  });

  it('moves focus vertically when orientation is both', async () => {
    render(<ToolbarTestbench />);
    const user = userEvent.setup();

    getButton('One').focus();
    await user.keyboard('{ArrowDown}');

    expect(getButton('Two')).toHaveFocus();
  });

  it('ignores vertical arrows when orientation is horizontal', async () => {
    render(<ToolbarTestbench orientation="horizontal" />);
    const user = userEvent.setup();

    getButton('One').focus();
    await user.keyboard('{ArrowDown}');

    expect(getButton('One')).toHaveFocus();
  });

  it('stops handled keys from bubbling to ancestors', () => {
    const onBubbledKeyDown = jest.fn();
    render(<ToolbarTestbench onBubbledKeyDown={onBubbledKeyDown} />);

    getButton('One').focus();
    fireEvent.keyDown(getButton('One'), { key: 'ArrowRight' });

    expect(onBubbledKeyDown).not.toHaveBeenCalled();
  });

  it('moves focus to the next item when the active item becomes disabled', () => {
    const { rerender } = render(<ToolbarTestbench />);

    getButton('One').focus();
    rerender(<ToolbarTestbench disabledIndex={0} />);

    expect(getButton('One')).toBeDisabled();
    expect(getButton('Two')).toHaveFocus();
    expect(getButton('Two')).toHaveAttribute('tabindex', '0');
  });

  it('does not manage tab stops when disabled', () => {
    render(<ToolbarTestbench disabled />);

    expect(getButton('One')).not.toHaveAttribute('tabindex', '0');
  });
});
