import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement, type ReactNode, useState } from 'react';
import {
  useCanvasNavigation,
  type UseCanvasNavigationOptions,
} from '../../../../../presentation/canvas/hooks/use-canvas-navigation';
import type { SelectableItem } from '../../../../../application/services';
import { Bounds } from '../../../../../domain/shared';

function item(id: string, x: number, y: number): SelectableItem {
  return { id, bounds: Bounds.fromXYWH(x, y, 10, 10) };
}

const ITEMS: readonly SelectableItem[] = [
  item('first', 0, 0),
  item('second', 100, 0),
  item('third', 0, 100),
];

interface TestbenchProps extends Omit<UseCanvasNavigationOptions, 'items'> {
  readonly items?: readonly SelectableItem[];
  readonly children?: ReactNode;
}

function Testbench({
  items = ITEMS,
  selectedIds,
  onNavigate,
  disabled,
  children,
}: TestbenchProps): ReactElement {
  const { activeId, ref } = useCanvasNavigation({ items, selectedIds, onNavigate, disabled });

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      data-testid="navigation-surface"
      data-active-id={activeId ?? undefined}
      role="application"
      tabIndex={0}
    >
      {children}
    </div>
  );
}

function ControlledTestbench({
  items = ITEMS,
}: {
  readonly items?: readonly SelectableItem[];
}): ReactElement {
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const { activeId, ref } = useCanvasNavigation({
    items,
    selectedIds,
    onNavigate: (id, additive) => {
      setSelectedIds((previous) => (additive ? [...previous, id] : [id]));
    },
  });

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      data-testid="navigation-surface"
      data-active-id={activeId ?? undefined}
      role="application"
      tabIndex={0}
    />
  );
}

describe('useCanvasNavigation', () => {
  it('does not navigate without a keydown', () => {
    const onNavigate = jest.fn();

    render(<Testbench selectedIds={[]} onNavigate={onNavigate} />);

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('selects the first item when navigating with no selection', async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();

    render(<Testbench selectedIds={[]} onNavigate={onNavigate} />);

    screen.getByTestId('navigation-surface').focus();
    await user.keyboard('{ArrowRight}');

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('first', false);
  });

  it('moves from the selected item in the direction', async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();

    render(<Testbench selectedIds={['first']} onNavigate={onNavigate} />);

    screen.getByTestId('navigation-surface').focus();
    await user.keyboard('{ArrowRight}');

    expect(onNavigate).toHaveBeenCalledWith('second', false);
  });

  it('extends the selection when shift is held', async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();

    render(<Testbench selectedIds={['first']} onNavigate={onNavigate} />);

    screen.getByTestId('navigation-surface').focus();
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');

    expect(onNavigate).toHaveBeenCalledWith('second', true);
  });

  it('keeps the active id predictable across navigations', async () => {
    const user = userEvent.setup();

    render(<ControlledTestbench />);
    const surface = screen.getByTestId('navigation-surface');

    surface.focus();
    await user.keyboard('{ArrowRight}');
    expect(surface).toHaveAttribute('data-active-id', 'first');

    await user.keyboard('{ArrowRight}');
    expect(surface).toHaveAttribute('data-active-id', 'second');
  });

  it('ignores non-arrow keys', async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();

    render(<Testbench selectedIds={['first']} onNavigate={onNavigate} />);

    screen.getByTestId('navigation-surface').focus();
    await user.keyboard('{Enter}');

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('ignores arrows combined with a modifier', async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();

    render(<Testbench selectedIds={['first']} onNavigate={onNavigate} />);

    screen.getByTestId('navigation-surface').focus();
    await user.keyboard('{Control>}{ArrowRight}{/Control}');

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('ignores navigation while an editable target is focused', async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();

    render(
      <Testbench selectedIds={['first']} onNavigate={onNavigate}>
        <input data-testid="editable" />
      </Testbench>,
    );

    screen.getByTestId('editable').focus();
    await user.keyboard('{ArrowRight}');

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('does nothing when the rotation handle owns the keyboard focus', async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();

    render(
      <Testbench selectedIds={['first']} onNavigate={onNavigate}>
        <button type="button" data-testid="rotate-handle" data-rotate-handle="true">
          Rotate
        </button>
      </Testbench>,
    );

    screen.getByTestId('rotate-handle').focus();
    await user.keyboard('{ArrowRight}');

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();

    render(<Testbench selectedIds={['first']} onNavigate={onNavigate} disabled />);

    screen.getByTestId('navigation-surface').focus();
    await user.keyboard('{ArrowRight}');

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('prevents the default action for handled keys', () => {
    const onNavigate = jest.fn();

    render(<Testbench selectedIds={['first']} onNavigate={onNavigate} />);
    const notPrevented = fireEvent.keyDown(screen.getByTestId('navigation-surface'), {
      key: 'ArrowRight',
    });

    expect(notPrevented).toBe(false);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('does not handle repeated keydowns', () => {
    const onNavigate = jest.fn();

    render(<Testbench selectedIds={['first']} onNavigate={onNavigate} />);
    const surface = screen.getByTestId('navigation-surface');

    fireEvent.keyDown(surface, { key: 'ArrowRight' });
    fireEvent.keyDown(surface, { key: 'ArrowRight', repeat: true });

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('removes the listener on unmount', () => {
    const onNavigate = jest.fn();

    const { unmount } = render(<Testbench selectedIds={['first']} onNavigate={onNavigate} />);
    const surface = screen.getByTestId('navigation-surface');

    unmount();
    fireEvent.keyDown(surface, { key: 'ArrowRight' });

    expect(onNavigate).not.toHaveBeenCalled();
  });
});
