import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement, type ReactNode } from 'react';
import {
  ElementId,
  Position,
  Size,
  Transform,
  UserId,
  Viewport,
  WorkspaceId,
} from '../../../../../domain/shared';
import { createTextElement, type Element as ElementRecord } from '../../../../../domain/element';
import {
  useElementMove,
  type UseElementMoveOptions,
} from '../../../../../presentation/canvas/hooks/use-element-move';

interface ElementMoveTestbenchProps extends Omit<UseElementMoveOptions, 'elements'> {
  readonly elements: readonly ElementRecord[];
  readonly children: ReactNode;
}

function ElementMoveTestbench({ children, ...options }: ElementMoveTestbenchProps): ReactElement {
  const { isMoving, ref } = useElementMove(options);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      data-testid="surface"
      data-moving={isMoving}
      role="application"
      aria-label="Canvas"
    >
      {children}
    </div>
  );
}

function dispatchPointer(type: string, target: Element, init: Record<string, unknown>): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, init);
  target.dispatchEvent(event);
}

function createItem(id: string, x: number, y: number): ElementRecord {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(x, y),
    size: Size.create(100, 40),
    content: 'hello',
  });
}

function createCapture() {
  const calls: (readonly ElementRecord[])[] = [];
  const onMoveElements = jest.fn((next: readonly ElementRecord[]) => {
    calls.push(next);
  });

  return { calls, onMoveElements };
}

const VIEWPORT = Viewport.default(Size.create(800, 600));

function renderSurface(
  options: Partial<UseElementMoveOptions> & { readonly children?: ReactNode } = {},
) {
  const { children, elements: providedElements, ...rest } = options;
  const elements = providedElements ?? [createItem('item', 10, 20)];

  return render(
    <ElementMoveTestbench viewport={VIEWPORT} selectedIds={[]} elements={elements} {...rest}>
      {children ?? (
        <div data-testid="item" data-selectable="true" data-element-id="item">
          item
        </div>
      )}
    </ElementMoveTestbench>,
  );
}

describe('useElementMove', () => {
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

  it('does not move below the drag threshold and treats it as a click', async () => {
    const onMoveElements = jest.fn();
    const onSelectOnly = jest.fn();
    renderSurface({ onMoveElements, onSelectOnly });
    const item = screen.getByTestId('item');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: item, coords: { x: 10, y: 10 } },
      { coords: { x: 12, y: 11 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onMoveElements).not.toHaveBeenCalled();
    expect(onSelectOnly).toHaveBeenCalledWith('item');
  });

  it('moves the targeted element by the world delta once the threshold is crossed', async () => {
    const elements = [createItem('item', 10, 20)];
    const { calls, onMoveElements } = createCapture();
    renderSurface({ elements, onMoveElements });
    const surface = screen.getByTestId('surface');
    const item = screen.getByTestId('item');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: item, coords: { x: 10, y: 10 } },
      { coords: { x: 60, y: 40 } },
    ]);

    expect(surface).toHaveAttribute('data-moving', 'true');
    expect(onMoveElements).toHaveBeenCalled();
    expect(calls.at(-1)?.[0]?.position.equals(Position.create(60, 50))).toBe(true);

    await user.pointer({ keys: '[/MouseLeft]' });
    expect(surface).toHaveAttribute('data-moving', 'false');
  });

  it('converts the screen delta to world coordinates with the viewport', async () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(0, 0), 2),
      Size.create(800, 600),
    );
    const elements = [createItem('item', 0, 0)];
    const { calls, onMoveElements } = createCapture();
    renderSurface({ viewport, elements, onMoveElements });
    const item = screen.getByTestId('item');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: item, coords: { x: 0, y: 0 } },
      { coords: { x: 100, y: 60 } },
    ]);

    expect(calls.at(-1)?.[0]?.position.equals(Position.create(50, 30))).toBe(true);
  });

  it('moves the whole selection when dragging an already selected element', async () => {
    const elements = [createItem('a', 0, 0), createItem('b', 200, 200)];
    const { calls, onMoveElements } = createCapture();
    renderSurface({
      elements,
      selectedIds: ['a', 'b'],
      onMoveElements,
      children: (
        <div data-testid="item-a" data-selectable="true" data-element-id="a">
          a
        </div>
      ),
    });
    const item = screen.getByTestId('item-a');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: item, coords: { x: 10, y: 10 } },
      { coords: { x: 60, y: 40 } },
    ]);

    expect(calls.at(-1)?.[0]?.position.equals(Position.create(50, 30))).toBe(true);
    expect(calls.at(-1)?.[1]?.position.equals(Position.create(250, 230))).toBe(true);
  });

  it('does not move when the press carries an additive modifier', async () => {
    const onMoveElements = jest.fn();
    const onSelectOnly = jest.fn();
    renderSurface({ onMoveElements, onSelectOnly });
    const item = screen.getByTestId('item');
    const user = userEvent.setup();

    await user.keyboard('{Shift>}');
    await user.pointer([
      { keys: '[MouseLeft>]', target: item, coords: { x: 10, y: 10 } },
      { coords: { x: 100, y: 100 } },
      { keys: '[/MouseLeft]' },
    ]);
    await user.keyboard('{/Shift}');

    expect(onMoveElements).not.toHaveBeenCalled();
    expect(onSelectOnly).not.toHaveBeenCalled();
  });

  it('yields the gesture while space is pressed for panning', async () => {
    const onMoveElements = jest.fn();
    const onSelectOnly = jest.fn();
    renderSurface({ onMoveElements, onSelectOnly, spacePressed: true });
    const item = screen.getByTestId('item');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: item, coords: { x: 10, y: 10 } },
      { coords: { x: 100, y: 100 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onMoveElements).not.toHaveBeenCalled();
    expect(onSelectOnly).not.toHaveBeenCalled();
  });

  it('does not move when pressing an interactive descendant', async () => {
    const onMoveElements = jest.fn();
    const onSelectOnly = jest.fn();
    renderSurface({
      onMoveElements,
      onSelectOnly,
      children: (
        <div data-selectable="true" data-element-id="item">
          <button data-testid="inner" type="button">
            action
          </button>
        </div>
      ),
    });
    const button = screen.getByTestId('inner');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: button, coords: { x: 10, y: 10 } },
      { coords: { x: 100, y: 100 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onMoveElements).not.toHaveBeenCalled();
    expect(onSelectOnly).not.toHaveBeenCalled();
  });

  it('does not start on a non selectable target', async () => {
    const onMoveElements = jest.fn();
    const onSelectOnly = jest.fn();
    renderSurface({ onMoveElements, onSelectOnly });
    const surface = screen.getByTestId('surface');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: surface, coords: { x: 400, y: 400 } },
      { coords: { x: 500, y: 500 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onMoveElements).not.toHaveBeenCalled();
    expect(onSelectOnly).not.toHaveBeenCalled();
  });

  it('cancels the gesture without moving or collapsing on pointer cancel', () => {
    const onMoveElements = jest.fn();
    const onSelectOnly = jest.fn();
    renderSurface({ onMoveElements, onSelectOnly });
    const surface = screen.getByTestId('surface');
    const item = screen.getByTestId('item');

    dispatchPointer('pointerdown', item, { button: 0, pointerId: 1, clientX: 10, clientY: 10 });
    act(() => {
      dispatchPointer('pointermove', item, { pointerId: 1, clientX: 100, clientY: 100 });
    });

    expect(onMoveElements).toHaveBeenCalled();
    expect(surface).toHaveAttribute('data-moving', 'true');

    act(() => {
      dispatchPointer('pointercancel', item, { pointerId: 1 });
    });

    expect(surface).toHaveAttribute('data-moving', 'false');
    act(() => {
      dispatchPointer('pointerup', item, { pointerId: 1 });
    });
    expect(onSelectOnly).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', async () => {
    const onMoveElements = jest.fn();
    const onSelectOnly = jest.fn();
    renderSurface({ onMoveElements, onSelectOnly, disabled: true });
    const item = screen.getByTestId('item');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: item, coords: { x: 10, y: 10 } },
      { coords: { x: 100, y: 100 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onMoveElements).not.toHaveBeenCalled();
    expect(onSelectOnly).not.toHaveBeenCalled();
  });
});
