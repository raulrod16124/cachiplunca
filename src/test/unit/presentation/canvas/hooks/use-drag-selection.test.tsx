import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement, type ReactNode } from 'react';
import { Bounds, Position, Size, Transform, Viewport } from '../../../../../domain/shared';
import type { SelectableItem } from '../../../../../application/services';
import {
  useDragSelection,
  type UseDragSelectionOptions,
} from '../../../../../presentation/canvas/hooks/use-drag-selection';

interface DragSelectionTestbenchProps extends UseDragSelectionOptions {
  readonly children?: ReactNode;
}

function DragSelectionTestbench({
  children,
  ...options
}: DragSelectionTestbenchProps): ReactElement {
  const { rect, ref } = useDragSelection(options);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      data-testid="drag-surface"
      data-selecting={rect !== null}
      role="application"
      aria-label="Canvas"
    >
      {rect !== null ? (
        <div
          data-testid="marquee"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
        />
      ) : null}
      {children}
    </div>
  );
}

function dispatchPointer(type: string, target: Element, init: Record<string, unknown>): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, init);
  target.dispatchEvent(event);
}

const ITEM: SelectableItem = { id: 'item', bounds: Bounds.fromXYWH(100, 100, 100, 100) };
const SECOND: SelectableItem = { id: 'second', bounds: Bounds.fromXYWH(300, 200, 100, 100) };
const VIEWPORT = Viewport.default(Size.create(800, 600));

describe('useDragSelection', () => {
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

  it('does not commit anything without a pointer down', async () => {
    const onSelect = jest.fn();
    const onClear = jest.fn();
    render(
      <DragSelectionTestbench
        items={[ITEM]}
        viewport={VIEWPORT}
        onSelect={onSelect}
        onClear={onClear}
      />,
    );
    const user = userEvent.setup();

    await user.pointer({ target: screen.getByTestId('drag-surface'), coords: { x: 10, y: 10 } });

    expect(onSelect).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
  });

  it('clears the selection when clicking empty space', async () => {
    const onSelect = jest.fn();
    const onClear = jest.fn();
    render(
      <DragSelectionTestbench
        items={[ITEM]}
        viewport={VIEWPORT}
        onSelect={onSelect}
        onClear={onClear}
      />,
    );
    const surface = screen.getByTestId('drag-surface');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: surface, coords: { x: 500, y: 500 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not clear while dragging below the threshold', async () => {
    const onSelect = jest.fn();
    const onClear = jest.fn();
    render(
      <DragSelectionTestbench
        items={[ITEM]}
        viewport={VIEWPORT}
        onSelect={onSelect}
        onClear={onClear}
      />,
    );
    const surface = screen.getByTestId('drag-surface');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: surface, coords: { x: 400, y: 400 } },
      { coords: { x: 402, y: 401 } },
    ]);

    expect(surface).toHaveAttribute('data-selecting', 'false');

    await user.pointer({ keys: '[/MouseLeft]' });

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selects the items intersecting the dragged rectangle', async () => {
    const onSelect = jest.fn();
    const onClear = jest.fn();
    render(
      <DragSelectionTestbench
        items={[ITEM, SECOND]}
        viewport={VIEWPORT}
        onSelect={onSelect}
        onClear={onClear}
      />,
    );
    const surface = screen.getByTestId('drag-surface');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: surface, coords: { x: 0, y: 0 } },
      { coords: { x: 350, y: 300 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(['item', 'second'], false);
    expect(onClear).not.toHaveBeenCalled();
  });

  it('shows the marquee rectangle while dragging and removes it after', async () => {
    const onSelect = jest.fn();
    render(
      <DragSelectionTestbench
        items={[ITEM]}
        viewport={VIEWPORT}
        onSelect={onSelect}
        onClear={jest.fn()}
      />,
    );
    const surface = screen.getByTestId('drag-surface');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: surface, coords: { x: 40, y: 60 } },
      { coords: { x: 140, y: 90 } },
    ]);

    expect(surface).toHaveAttribute('data-selecting', 'true');
    const marquee = screen.getByTestId('marquee');
    expect(marquee.style.left).toBe('40px');
    expect(marquee.style.top).toBe('60px');
    expect(marquee.style.width).toBe('100px');
    expect(marquee.style.height).toBe('30px');

    await user.pointer({ keys: '[/MouseLeft]' });

    expect(surface).toHaveAttribute('data-selecting', 'false');
    expect(screen.queryByTestId('marquee')).not.toBeInTheDocument();
  });

  it('normalizes a rectangle dragged up and to the left', async () => {
    const onSelect = jest.fn();
    render(
      <DragSelectionTestbench
        items={[ITEM]}
        viewport={VIEWPORT}
        onSelect={onSelect}
        onClear={jest.fn()}
      />,
    );
    const surface = screen.getByTestId('drag-surface');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: surface, coords: { x: 250, y: 250 } },
      { coords: { x: 50, y: 50 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onSelect).toHaveBeenCalledWith(['item'], false);
  });

  it('selects nothing but replaces the selection when the rectangle is empty', async () => {
    const onSelect = jest.fn();
    render(
      <DragSelectionTestbench
        items={[ITEM]}
        viewport={VIEWPORT}
        onSelect={onSelect}
        onClear={jest.fn()}
      />,
    );
    const surface = screen.getByTestId('drag-surface');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: surface, coords: { x: 500, y: 500 } },
      { coords: { x: 600, y: 600 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onSelect).toHaveBeenCalledWith([], false);
  });

  it('flags an additive drag with a modifier key', async () => {
    const onSelect = jest.fn();
    render(
      <DragSelectionTestbench
        items={[ITEM]}
        viewport={VIEWPORT}
        onSelect={onSelect}
        onClear={jest.fn()}
      />,
    );
    const surface = screen.getByTestId('drag-surface');
    const user = userEvent.setup();

    await user.keyboard('{Shift>}');
    await user.pointer([
      { keys: '[MouseLeft>]', target: surface, coords: { x: 0, y: 0 } },
      { coords: { x: 250, y: 250 } },
      { keys: '[/MouseLeft]' },
    ]);
    await user.keyboard('{/Shift}');

    expect(onSelect).toHaveBeenCalledWith(['item'], true);
  });

  it('does not start a drag on a selectable item', async () => {
    const onSelect = jest.fn();
    const onClear = jest.fn();
    render(
      <DragSelectionTestbench
        items={[ITEM]}
        viewport={VIEWPORT}
        onSelect={onSelect}
        onClear={onClear}
      />,
    );
    const surface = screen.getByTestId('drag-surface');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: surface, coords: { x: 150, y: 150 } },
      { coords: { x: 400, y: 400 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onSelect).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
    expect(surface).toHaveAttribute('data-selecting', 'false');
  });

  it('does not start a drag on interactive descendants', async () => {
    const onSelect = jest.fn();
    const onClear = jest.fn();
    render(
      <DragSelectionTestbench
        items={[ITEM]}
        viewport={VIEWPORT}
        onSelect={onSelect}
        onClear={onClear}
      >
        <button data-testid="interactive-button">Click me</button>
      </DragSelectionTestbench>,
    );
    const button = screen.getByTestId('interactive-button');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: button, coords: { x: 0, y: 0 } },
      { coords: { x: 200, y: 200 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onSelect).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
  });

  it('yields the gesture while space is pressed for panning', async () => {
    const onSelect = jest.fn();
    const onClear = jest.fn();
    render(
      <DragSelectionTestbench
        items={[ITEM]}
        viewport={VIEWPORT}
        onSelect={onSelect}
        onClear={onClear}
        spacePressed
      />,
    );
    const surface = screen.getByTestId('drag-surface');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: surface, coords: { x: 0, y: 0 } },
      { coords: { x: 250, y: 250 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onSelect).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
  });

  it('converts the rectangle to world coordinates with the viewport', async () => {
    const onSelect = jest.fn();
    const viewport = Viewport.create(
      Transform.create(Position.create(50, 50), 2),
      Size.create(800, 600),
    );
    render(
      <DragSelectionTestbench
        items={[ITEM]}
        viewport={viewport}
        onSelect={onSelect}
        onClear={jest.fn()}
      />,
    );
    const surface = screen.getByTestId('drag-surface');
    const user = userEvent.setup();

    const topLeft = viewport.worldToScreen(Position.create(100, 100));
    const bottomRight = viewport.worldToScreen(Position.create(200, 200));

    await user.pointer([
      { keys: '[MouseLeft>]', target: surface, coords: { x: 0, y: 0 } },
      { coords: { x: bottomRight.x, y: bottomRight.y } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(topLeft.x).toBeGreaterThan(0);
    expect(onSelect).toHaveBeenCalledWith(['item'], false);
  });

  it('cancels the drag without committing on pointer cancel', () => {
    const onSelect = jest.fn();
    const onClear = jest.fn();
    render(
      <DragSelectionTestbench
        items={[ITEM]}
        viewport={VIEWPORT}
        onSelect={onSelect}
        onClear={onClear}
      />,
    );
    const surface = screen.getByTestId('drag-surface');

    dispatchPointer('pointerdown', surface, { button: 0, pointerId: 1, clientX: 0, clientY: 0 });
    act(() => {
      dispatchPointer('pointermove', surface, { pointerId: 1, clientX: 250, clientY: 250 });
    });
    expect(surface).toHaveAttribute('data-selecting', 'true');

    act(() => {
      dispatchPointer('pointercancel', surface, { pointerId: 1 });
    });

    expect(onSelect).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
    expect(surface).toHaveAttribute('data-selecting', 'false');
  });
  it('does nothing when disabled', async () => {
    const onSelect = jest.fn();
    const onClear = jest.fn();
    render(
      <DragSelectionTestbench
        items={[ITEM]}
        viewport={VIEWPORT}
        onSelect={onSelect}
        onClear={onClear}
        disabled
      />,
    );
    const surface = screen.getByTestId('drag-surface');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: surface, coords: { x: 0, y: 0 } },
      { coords: { x: 250, y: 250 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onSelect).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
  });
});
