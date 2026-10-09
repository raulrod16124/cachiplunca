import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement, type ReactNode } from 'react';
import { Position } from '../../../../../domain/shared';
import { usePan, type UsePanOptions } from '../../../../../presentation/canvas/hooks/use-pan';

interface PanTestbenchProps extends UsePanOptions {
  readonly children?: ReactNode;
}

function PanTestbench({ children, ...options }: PanTestbenchProps): ReactElement {
  const { isPanning, ref } = usePan(options);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      data-testid="pan-surface"
      data-panning={isPanning}
      role="application"
      aria-label="Canvas"
    >
      {children}
    </div>
  );
}

describe('usePan', () => {
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

  it('does not call onPan before pointer down', async () => {
    const onPan = jest.fn();
    render(<PanTestbench onPan={onPan} />);
    const user = userEvent.setup();

    await user.pointer({ target: screen.getByTestId('pan-surface'), coords: { x: 10, y: 10 } });

    expect(onPan).not.toHaveBeenCalled();
  });

  it('does not pan with a plain left drag', async () => {
    const onPan = jest.fn();
    render(<PanTestbench onPan={onPan} />);
    const surface = screen.getByTestId('pan-surface');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: surface, coords: { x: 0, y: 0 } },
      { coords: { x: 20, y: 10 } },
    ]);

    expect(onPan).not.toHaveBeenCalled();
  });

  it('calls onPan with the pointer movement delta while space is pressed', async () => {
    const onPan = jest.fn();
    render(<PanTestbench onPan={onPan} spacePressed />);
    const surface = screen.getByTestId('pan-surface');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: surface, coords: { x: 0, y: 0 } },
      { coords: { x: 20, y: 10 } },
    ]);

    expect(onPan).toHaveBeenCalledTimes(1);
    expect(onPan).toHaveBeenCalledWith(Position.create(20, 10));
  });

  it('accumulates deltas across multiple moves', async () => {
    const onPan = jest.fn();
    render(<PanTestbench onPan={onPan} spacePressed />);
    const surface = screen.getByTestId('pan-surface');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: surface, coords: { x: 0, y: 0 } },
      { coords: { x: 10, y: 0 } },
      { coords: { x: 30, y: 5 } },
    ]);

    expect(onPan).toHaveBeenCalledTimes(2);
    expect(onPan).toHaveBeenNthCalledWith(1, Position.create(10, 0));
    expect(onPan).toHaveBeenNthCalledWith(2, Position.create(20, 5));
  });

  it('stops panning after pointer up', async () => {
    const onPan = jest.fn();
    render(<PanTestbench onPan={onPan} spacePressed />);
    const surface = screen.getByTestId('pan-surface');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: surface, coords: { x: 0, y: 0 } },
      { coords: { x: 10, y: 0 } },
      { keys: '[/MouseLeft]' },
      { coords: { x: 20, y: 0 } },
    ]);

    expect(onPan).toHaveBeenCalledTimes(1);
  });

  it('pans with the middle mouse button', async () => {
    const onPan = jest.fn();
    render(<PanTestbench onPan={onPan} />);
    const surface = screen.getByTestId('pan-surface');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseMiddle>]', target: surface, coords: { x: 0, y: 0 } },
      { coords: { x: 20, y: 10 } },
    ]);

    expect(onPan).toHaveBeenCalledWith(Position.create(20, 10));
  });

  it('ignores the secondary mouse button', async () => {
    const onPan = jest.fn();
    render(<PanTestbench onPan={onPan} spacePressed />);
    const surface = screen.getByTestId('pan-surface');
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseRight>]', target: surface, coords: { x: 0, y: 0 } },
      { coords: { x: 20, y: 0 } },
    ]);

    expect(onPan).not.toHaveBeenCalled();
  });

  it('pans on a plain wheel scroll', () => {
    const onPan = jest.fn();
    render(<PanTestbench onPan={onPan} />);
    const surface = screen.getByTestId('pan-surface');

    fireEvent.wheel(surface, { deltaX: 5, deltaY: 100 });

    expect(onPan).toHaveBeenCalledWith(Position.create(-5, -100));
  });

  it('ignores the wheel when a zoom modifier is pressed', () => {
    const onPan = jest.fn();
    render(<PanTestbench onPan={onPan} />);
    const surface = screen.getByTestId('pan-surface');

    fireEvent.wheel(surface, { ctrlKey: true, deltaY: 100 });

    expect(onPan).not.toHaveBeenCalled();
  });

  it('reports panning state while dragging', async () => {
    render(<PanTestbench onPan={jest.fn()} spacePressed />);
    const surface = screen.getByTestId('pan-surface');
    const user = userEvent.setup();

    expect(surface).toHaveAttribute('data-panning', 'false');

    await user.pointer({ keys: '[MouseLeft>]', target: surface, coords: { x: 0, y: 0 } });

    expect(surface).toHaveAttribute('data-panning', 'true');

    await user.pointer({ keys: '[/MouseLeft]' });

    expect(surface).toHaveAttribute('data-panning', 'false');
  });
});
