import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement, type ReactNode } from 'react';
import { Bounds, Position, Size, Transform, Viewport } from '../../../../../domain/shared';
import type { SelectableItem } from '../../../../../application/services';
import {
  useSelection,
  type UseSelectionOptions,
} from '../../../../../presentation/canvas/hooks/use-selection';

interface SelectionTestbenchProps extends UseSelectionOptions {
  readonly children?: ReactNode;
}

function SelectionTestbench({ children, ...options }: SelectionTestbenchProps): ReactElement {
  const { ref } = useSelection(options);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      data-testid="selection-surface"
      role="application"
      aria-label="Canvas"
    >
      {children}
    </div>
  );
}

const ITEM: SelectableItem = { id: 'item', bounds: Bounds.fromXYWH(100, 100, 100, 100) };
const VIEWPORT = Viewport.default(Size.create(800, 600));

describe('useSelection', () => {
  it('does not call onSelect without a pointer down', async () => {
    const onSelect = jest.fn();
    render(<SelectionTestbench items={[ITEM]} viewport={VIEWPORT} onSelect={onSelect} />);
    const user = userEvent.setup();

    await user.pointer({
      target: screen.getByTestId('selection-surface'),
      coords: { x: 150, y: 150 },
    });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selects the item under the pointer on pointer down', async () => {
    const onSelect = jest.fn();
    render(<SelectionTestbench items={[ITEM]} viewport={VIEWPORT} onSelect={onSelect} />);
    const user = userEvent.setup();

    await user.pointer({
      keys: '[MouseLeft>]',
      target: screen.getByTestId('selection-surface'),
      coords: { x: 150, y: 150 },
    });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('item', false);
  });

  it('does not select when pressing empty space', async () => {
    const onSelect = jest.fn();
    render(<SelectionTestbench items={[ITEM]} viewport={VIEWPORT} onSelect={onSelect} />);
    const user = userEvent.setup();

    await user.pointer({
      keys: '[MouseLeft>]',
      target: screen.getByTestId('selection-surface'),
      coords: { x: 500, y: 500 },
    });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not select when there are no items', async () => {
    const onSelect = jest.fn();
    render(<SelectionTestbench items={[]} viewport={VIEWPORT} onSelect={onSelect} />);
    const user = userEvent.setup();

    await user.pointer({
      keys: '[MouseLeft>]',
      target: screen.getByTestId('selection-surface'),
      coords: { x: 150, y: 150 },
    });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('converts screen coordinates with the current viewport', async () => {
    const onSelect = jest.fn();
    const viewport = Viewport.create(
      Transform.create(Position.create(50, 50), 2),
      Size.create(800, 600),
    );
    const screenPoint = viewport.worldToScreen(Position.create(150, 150));
    render(<SelectionTestbench items={[ITEM]} viewport={viewport} onSelect={onSelect} />);
    const user = userEvent.setup();

    await user.pointer({
      keys: '[MouseLeft>]',
      target: screen.getByTestId('selection-surface'),
      coords: { x: screenPoint.x, y: screenPoint.y },
    });

    expect(onSelect).toHaveBeenCalledWith('item', false);
  });

  it('flags additive selection with shift', async () => {
    const onSelect = jest.fn();
    render(<SelectionTestbench items={[ITEM]} viewport={VIEWPORT} onSelect={onSelect} />);
    const user = userEvent.setup();

    await user.keyboard('{Shift>}');
    await user.pointer({
      keys: '[MouseLeft>]',
      target: screen.getByTestId('selection-surface'),
      coords: { x: 150, y: 150 },
    });
    await user.keyboard('{/Shift}');

    expect(onSelect).toHaveBeenCalledWith('item', true);
  });

  it('flags additive selection with meta', async () => {
    const onSelect = jest.fn();
    render(<SelectionTestbench items={[ITEM]} viewport={VIEWPORT} onSelect={onSelect} />);
    const user = userEvent.setup();

    await user.keyboard('{Meta>}');
    await user.pointer({
      keys: '[MouseLeft>]',
      target: screen.getByTestId('selection-surface'),
      coords: { x: 150, y: 150 },
    });
    await user.keyboard('{/Meta}');

    expect(onSelect).toHaveBeenCalledWith('item', true);
  });

  it('flags additive selection with ctrl', async () => {
    const onSelect = jest.fn();
    render(<SelectionTestbench items={[ITEM]} viewport={VIEWPORT} onSelect={onSelect} />);
    const user = userEvent.setup();

    await user.keyboard('{Control>}');
    await user.pointer({
      keys: '[MouseLeft>]',
      target: screen.getByTestId('selection-surface'),
      coords: { x: 150, y: 150 },
    });
    await user.keyboard('{/Control}');

    expect(onSelect).toHaveBeenCalledWith('item', true);
  });

  it('ignores non-primary mouse button', async () => {
    const onSelect = jest.fn();
    render(<SelectionTestbench items={[ITEM]} viewport={VIEWPORT} onSelect={onSelect} />);
    const user = userEvent.setup();

    await user.pointer({
      keys: '[MouseRight>]',
      target: screen.getByTestId('selection-surface'),
      coords: { x: 150, y: 150 },
    });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('ignores presses on interactive descendants', async () => {
    const onSelect = jest.fn();
    render(
      <SelectionTestbench items={[ITEM]} viewport={VIEWPORT} onSelect={onSelect}>
        <button data-testid="interactive-button">Click me</button>
      </SelectionTestbench>,
    );
    const button = screen.getByTestId('interactive-button');
    const user = userEvent.setup();

    await user.pointer({ keys: '[MouseLeft>]', target: button, coords: { x: 0, y: 0 } });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', async () => {
    const onSelect = jest.fn();
    render(<SelectionTestbench items={[ITEM]} viewport={VIEWPORT} onSelect={onSelect} disabled />);
    const user = userEvent.setup();

    await user.pointer({
      keys: '[MouseLeft>]',
      target: screen.getByTestId('selection-surface'),
      coords: { x: 150, y: 150 },
    });

    expect(onSelect).not.toHaveBeenCalled();
  });
});
