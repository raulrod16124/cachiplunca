import { render, screen } from '@testing-library/react';
import { type ReactElement } from 'react';
import { Position, Size, Transform, Viewport } from '../../../../../domain/shared';
import {
  useCursorBroadcast,
  type UseCursorBroadcastOptions,
} from '../../../../../presentation/canvas/hooks/use-cursor-broadcast';

const IDENTITY_VIEWPORT = Viewport.default(Size.create(800, 600));

function dispatchPointer(type: string, target: Element, init: Record<string, unknown>): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, init);
  target.dispatchEvent(event);
}

interface TestbenchProps {
  readonly onCursorMove: (position: Position) => void;
  readonly viewport?: Viewport;
  readonly disabled?: boolean;
}

function Testbench({
  onCursorMove,
  viewport = IDENTITY_VIEWPORT,
  disabled,
}: TestbenchProps): ReactElement {
  const options: UseCursorBroadcastOptions = { onCursorMove, viewport, disabled };
  const { ref } = useCursorBroadcast(options);

  return (
    <div
      ref={(node) => {
        ref.current = node;
        if (node !== null) {
          jest.spyOn(node, 'getBoundingClientRect').mockReturnValue({
            left: 100,
            top: 50,
            right: 900,
            bottom: 650,
            width: 800,
            height: 600,
            x: 100,
            y: 50,
            toJSON: () => ({}),
          });
        }
      }}
      data-testid="surface"
    />
  );
}

describe('useCursorBroadcast', () => {
  it('reports the pointer position projected to world coordinates', () => {
    const onCursorMove = jest.fn();
    render(<Testbench onCursorMove={onCursorMove} />);

    dispatchPointer('pointermove', screen.getByTestId('surface'), { clientX: 130, clientY: 80 });

    expect(onCursorMove).toHaveBeenCalledTimes(1);
    expect(onCursorMove.mock.calls[0]?.[0].toJSON()).toEqual({ x: 30, y: 30 });
  });

  it('applies the viewport transform when projecting', () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(10, 10), 2),
      Size.create(800, 600),
    );
    const onCursorMove = jest.fn();
    render(<Testbench onCursorMove={onCursorMove} viewport={viewport} />);

    dispatchPointer('pointermove', screen.getByTestId('surface'), { clientX: 100, clientY: 50 });

    expect(onCursorMove.mock.calls[0]?.[0].toJSON()).toEqual({ x: 10, y: 10 });
  });

  it('does not broadcast while disabled', () => {
    const onCursorMove = jest.fn();
    render(<Testbench onCursorMove={onCursorMove} disabled />);

    dispatchPointer('pointermove', screen.getByTestId('surface'), { clientX: 130, clientY: 80 });

    expect(onCursorMove).not.toHaveBeenCalled();
  });

  it('stops broadcasting after unmount', () => {
    const onCursorMove = jest.fn();
    const { unmount } = render(<Testbench onCursorMove={onCursorMove} />);
    const surface = screen.getByTestId('surface');

    unmount();

    dispatchPointer('pointermove', surface, { clientX: 130, clientY: 80 });

    expect(onCursorMove).not.toHaveBeenCalled();
  });
});
