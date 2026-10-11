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
  useElementResize,
  type UseElementResizeOptions,
} from '../../../../../presentation/canvas/hooks/use-element-resize';

interface ElementResizeTestbenchProps extends Omit<UseElementResizeOptions, 'elements'> {
  readonly elements: readonly ElementRecord[];
  readonly children: ReactNode;
}

function ElementResizeTestbench({
  children,
  ...options
}: ElementResizeTestbenchProps): ReactElement {
  const { isResizing, ref } = useElementResize(options);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      data-testid="surface"
      data-resizing={isResizing}
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

const HANDLE = (
  <span data-testid="handle" data-resize-handle="true" data-resize-anchor="bottom-right" />
);

const VIEWPORT = Viewport.default(Size.create(800, 600));

function renderSurface(
  options: Partial<UseElementResizeOptions> & { readonly children?: ReactNode } = {},
) {
  const { children, elements: providedElements, ...rest } = options;
  const elements = providedElements ?? [createItem('item', 10, 20)];

  return render(
    <ElementResizeTestbench
      viewport={VIEWPORT}
      selectedIds={['item']}
      elements={elements}
      {...rest}
    >
      {children ?? HANDLE}
    </ElementResizeTestbench>,
  );
}

describe('useElementResize', () => {
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

  it('does not resize below the drag threshold', async () => {
    const onResizeElements = jest.fn();
    renderSurface({ onResizeElements });
    const handle = screen.getByTestId('handle');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { x: 110, y: 60 } },
      { coords: { x: 112, y: 61 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onResizeElements).not.toHaveBeenCalled();
  });

  it('resizes the selected element by the world delta once the threshold is crossed', async () => {
    const elements = [createItem('item', 10, 20)];
    const onResizeElements = jest.fn();
    renderSurface({ elements, onResizeElements });
    const surface = screen.getByTestId('surface');
    const handle = screen.getByTestId('handle');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { x: 110, y: 60 } },
      { coords: { x: 140, y: 90 } },
    ]);

    expect(surface).toHaveAttribute('data-resizing', 'true');
    expect(onResizeElements).toHaveBeenCalled();
    const next = onResizeElements.mock.calls.at(-1)?.[0] as readonly ElementRecord[];
    expect(next[0]?.size.equals(Size.create(130, 70))).toBe(true);
    expect(next[0]?.position.equals(Position.create(10, 20))).toBe(true);

    await user.pointer({ keys: '[/MouseLeft]' });
    expect(surface).toHaveAttribute('data-resizing', 'false');
  });

  it('converts the screen delta to world coordinates with the viewport', async () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(0, 0), 2),
      Size.create(800, 600),
    );
    const elements = [createItem('item', 0, 0)];
    const onResizeElements = jest.fn();
    renderSurface({ viewport, elements, onResizeElements });
    const handle = screen.getByTestId('handle');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { x: 0, y: 0 } },
      { coords: { x: 100, y: 60 } },
    ]);

    const next = onResizeElements.mock.calls.at(-1)?.[0] as readonly ElementRecord[];
    expect(next[0]?.size.equals(Size.create(150, 70))).toBe(true);
  });

  it('does not resize when more than one element is selected', async () => {
    const onResizeElements = jest.fn();
    renderSurface({
      elements: [createItem('a', 0, 0), createItem('b', 200, 200)],
      selectedIds: ['a', 'b'],
      onResizeElements,
    });
    const handle = screen.getByTestId('handle');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { x: 110, y: 60 } },
      { coords: { x: 160, y: 110 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onResizeElements).not.toHaveBeenCalled();
  });

  it('does not resize when nothing is selected', async () => {
    const onResizeElements = jest.fn();
    renderSurface({ selectedIds: [], onResizeElements });
    const handle = screen.getByTestId('handle');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { x: 110, y: 60 } },
      { coords: { x: 160, y: 110 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onResizeElements).not.toHaveBeenCalled();
  });

  it('yields the gesture while space is pressed for panning', async () => {
    const onResizeElements = jest.fn();
    renderSurface({ onResizeElements, spacePressed: true });
    const handle = screen.getByTestId('handle');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { x: 110, y: 60 } },
      { coords: { x: 160, y: 110 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onResizeElements).not.toHaveBeenCalled();
  });

  it('does not start on a non handle target', async () => {
    const onResizeElements = jest.fn();
    renderSurface({
      onResizeElements,
      children: <span data-testid="plain" />,
    });
    const plain = screen.getByTestId('plain');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: plain, coords: { x: 10, y: 10 } },
      { coords: { x: 100, y: 100 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onResizeElements).not.toHaveBeenCalled();
  });

  it('does not start on a handle with an unknown anchor', async () => {
    const onResizeElements = jest.fn();
    renderSurface({
      onResizeElements,
      children: <span data-testid="handle" data-resize-handle="true" data-resize-anchor="nope" />,
    });
    const handle = screen.getByTestId('handle');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { x: 10, y: 10 } },
      { coords: { x: 100, y: 100 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onResizeElements).not.toHaveBeenCalled();
  });

  it('cancels the gesture without resizing further on pointer cancel', () => {
    const onResizeElements = jest.fn();
    renderSurface({ onResizeElements });
    const surface = screen.getByTestId('surface');
    const handle = screen.getByTestId('handle');

    dispatchPointer('pointerdown', handle, { button: 0, pointerId: 1, clientX: 110, clientY: 60 });
    act(() => {
      dispatchPointer('pointermove', handle, { pointerId: 1, clientX: 160, clientY: 110 });
    });

    expect(onResizeElements).toHaveBeenCalled();

    act(() => {
      dispatchPointer('pointercancel', handle, { pointerId: 1 });
    });

    expect(surface).toHaveAttribute('data-resizing', 'false');
  });

  it('does nothing when disabled', async () => {
    const onResizeElements = jest.fn();
    renderSurface({ onResizeElements, disabled: true });
    const handle = screen.getByTestId('handle');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { x: 110, y: 60 } },
      { coords: { x: 160, y: 110 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onResizeElements).not.toHaveBeenCalled();
  });
});
