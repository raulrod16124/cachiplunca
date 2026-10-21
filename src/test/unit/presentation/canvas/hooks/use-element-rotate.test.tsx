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
import {
  createConnectorElement,
  createTextElement,
  type Element as ElementRecord,
} from '../../../../../domain/element';
import {
  useElementRotate,
  type UseElementRotateOptions,
} from '../../../../../presentation/canvas/hooks/use-element-rotate';

interface ElementRotateTestbenchProps extends Omit<UseElementRotateOptions, 'elements'> {
  readonly elements: readonly ElementRecord[];
  readonly children: ReactNode;
}

function ElementRotateTestbench({
  children,
  ...options
}: ElementRotateTestbenchProps): ReactElement {
  const { isRotating, ref } = useElementRotate(options);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      data-testid="surface"
      data-rotating={isRotating}
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

function createItem(id: string, x: number, y: number, rotation = 0): ElementRecord {
  return createTextElement({
    id: ElementId.create(id),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(x, y),
    size: Size.create(100, 40),
    rotation,
    content: 'hello',
  });
}

function createConnector(): ElementRecord {
  return createConnectorElement({
    id: ElementId.create('connector'),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(0, 0),
    size: Size.create(100, 40),
    sourcePoint: Position.create(0, 0),
    targetPoint: Position.create(100, 40),
  });
}

const ROTATE_HANDLE = (
  <button type="button" data-testid="rotate-handle" data-rotate-handle="true">
    Rotate
  </button>
);

const VIEWPORT = Viewport.default(Size.create(800, 600));

function renderSurface(
  options: Partial<UseElementRotateOptions> & { readonly children?: ReactNode } = {},
) {
  const { children, elements: providedElements, ...rest } = options;
  const elements = providedElements ?? [createItem('item', 10, 20)];

  return render(
    <ElementRotateTestbench
      viewport={VIEWPORT}
      selectedIds={['item']}
      elements={elements}
      onRotateElements={jest.fn()}
      {...rest}
    >
      {children ?? ROTATE_HANDLE}
    </ElementRotateTestbench>,
  );
}

function lastElements(callback: jest.Mock): readonly ElementRecord[] {
  return callback.mock.calls.at(-1)?.[0] as readonly ElementRecord[];
}

describe('useElementRotate', () => {
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

  it('does not rotate below the drag threshold', async () => {
    const onRotateElements = jest.fn();
    renderSurface({ onRotateElements });
    const handle = screen.getByTestId('rotate-handle');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { x: 60, y: 20 } },
      { coords: { x: 62, y: 21 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onRotateElements).not.toHaveBeenCalled();
  });

  it('rotates the selected element around its center once the threshold is crossed', async () => {
    const onRotateElements = jest.fn();
    const onTransformEnd = jest.fn();
    renderSurface({ onRotateElements, onTransformEnd });
    const surface = screen.getByTestId('surface');
    const handle = screen.getByTestId('rotate-handle');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { x: 60, y: 20 } },
      { coords: { x: 90, y: 40 } },
    ]);

    expect(surface).toHaveAttribute('data-rotating', 'true');
    expect(lastElements(onRotateElements)[0]?.rotation).toBeCloseTo(90);

    await user.pointer({ keys: '[/MouseLeft]' });

    expect(surface).toHaveAttribute('data-rotating', 'false');
    expect(onTransformEnd).toHaveBeenCalledTimes(1);
  });

  it('snaps to 15 degree steps while shift is pressed', async () => {
    const onRotateElements = jest.fn();
    renderSurface({ onRotateElements });
    const handle = screen.getByTestId('rotate-handle');
    const user = userEvent.setup();

    await user.keyboard('{Shift>}');
    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { x: 60, y: 20 } },
      { coords: { x: 70, y: 20 } },
      { keys: '[/MouseLeft]' },
    ]);
    await user.keyboard('{/Shift}');

    expect(lastElements(onRotateElements)[0]?.rotation).toBeCloseTo(30);
  });

  it('converts screen coordinates with the viewport scale', async () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(0, 0), 2),
      Size.create(800, 600),
    );
    const onRotateElements = jest.fn();
    renderSurface({ viewport, elements: [createItem('item', 0, 0)], onRotateElements });
    const handle = screen.getByTestId('rotate-handle');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { x: 100, y: 0 } },
      { coords: { x: 200, y: 40 } },
    ]);

    expect(lastElements(onRotateElements)[0]?.rotation).toBeCloseTo(90);
  });

  it('does not rotate connectors', async () => {
    const onRotateElements = jest.fn();
    renderSurface({
      elements: [createConnector()],
      selectedIds: ['connector'],
      onRotateElements,
    });
    const handle = screen.getByTestId('rotate-handle');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { x: 60, y: 20 } },
      { coords: { x: 90, y: 40 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onRotateElements).not.toHaveBeenCalled();
  });

  it('does not rotate a multiple selection', async () => {
    const onRotateElements = jest.fn();
    renderSurface({
      elements: [createItem('a', 0, 0), createItem('b', 200, 200)],
      selectedIds: ['a', 'b'],
      onRotateElements,
    });
    const handle = screen.getByTestId('rotate-handle');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { x: 60, y: 20 } },
      { coords: { x: 90, y: 40 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onRotateElements).not.toHaveBeenCalled();
  });

  it('yields the gesture while space is pressed for panning', async () => {
    const onRotateElements = jest.fn();
    renderSurface({ onRotateElements, spacePressed: true });
    const handle = screen.getByTestId('rotate-handle');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: handle, coords: { x: 60, y: 20 } },
      { coords: { x: 90, y: 40 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onRotateElements).not.toHaveBeenCalled();
  });

  it('does not start on a target without the handle attribute', async () => {
    const onRotateElements = jest.fn();
    renderSurface({
      onRotateElements,
      children: <span data-testid="plain" />,
    });
    const plain = screen.getByTestId('plain');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: plain, coords: { x: 60, y: 20 } },
      { coords: { x: 90, y: 40 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onRotateElements).not.toHaveBeenCalled();
  });

  it('rotates in one degree steps with the arrow keys', async () => {
    const onRotateElements = jest.fn();
    const onTransformEnd = jest.fn();
    renderSurface({ onRotateElements, onTransformEnd, elements: [createItem('item', 0, 0, 10)] });
    const handle = screen.getByTestId('rotate-handle');
    const user = userEvent.setup();

    handle.focus();
    await user.keyboard('{ArrowRight}');

    expect(lastElements(onRotateElements)[0]?.rotation).toBe(11);
    expect(onTransformEnd).toHaveBeenCalledTimes(1);
  });

  it('uses 15 degree steps with shift and the arrow keys', async () => {
    const onRotateElements = jest.fn();
    renderSurface({ onRotateElements, elements: [createItem('item', 0, 0, 10)] });
    const handle = screen.getByTestId('rotate-handle');
    const user = userEvent.setup();

    handle.focus();
    await user.keyboard('{Shift>}{ArrowLeft}{/Shift}');

    expect(lastElements(onRotateElements)[0]?.rotation).toBe(355);
  });

  it('cancels the gesture without committing on pointer cancel', () => {
    const onRotateElements = jest.fn();
    const onTransformEnd = jest.fn();
    renderSurface({ onRotateElements, onTransformEnd });
    const handle = screen.getByTestId('rotate-handle');

    dispatchPointer('pointerdown', handle, { button: 0, pointerId: 1, clientX: 60, clientY: 20 });
    act(() => {
      dispatchPointer('pointermove', handle, { pointerId: 1, clientX: 90, clientY: 40 });
    });

    expect(onRotateElements).toHaveBeenCalled();

    act(() => {
      dispatchPointer('pointercancel', handle, { pointerId: 1 });
    });

    expect(onTransformEnd).toHaveBeenCalledTimes(1);
  });
});
