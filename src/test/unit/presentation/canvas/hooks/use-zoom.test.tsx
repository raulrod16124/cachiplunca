import { fireEvent, render, screen } from '@testing-library/react';
import { type ReactElement } from 'react';
import { Position } from '../../../../../domain/shared';
import {
  DEFAULT_ZOOM_SENSITIVITY,
  useZoom,
  type UseZoomOptions,
} from '../../../../../presentation/canvas/hooks/use-zoom';

interface ZoomTestbenchProps extends UseZoomOptions {
  readonly offsetLeft?: number;
  readonly offsetTop?: number;
}

function ZoomTestbench({
  offsetLeft = 100,
  offsetTop = 50,
  ...options
}: ZoomTestbenchProps): ReactElement {
  const { ref } = useZoom(options);

  return (
    <div
      ref={(node) => {
        ref.current = node;
        if (node !== null) {
          jest.spyOn(node, 'getBoundingClientRect').mockReturnValue({
            left: offsetLeft,
            top: offsetTop,
            right: 0,
            bottom: 0,
            width: 0,
            height: 0,
            x: offsetLeft,
            y: offsetTop,
            toJSON: () => ({}),
          } as DOMRect);
        }
      }}
      data-testid="zoom-surface"
      role="application"
      aria-label="Canvas"
    />
  );
}

describe('useZoom', () => {
  it('does not zoom on a plain wheel event', () => {
    const onZoom = jest.fn();
    render(<ZoomTestbench onZoom={onZoom} />);

    fireEvent.wheel(screen.getByTestId('zoom-surface'), { deltaY: -100 });

    expect(onZoom).not.toHaveBeenCalled();
  });

  it('zooms in on ctrl + wheel up around the pointer', () => {
    const onZoom = jest.fn();
    render(<ZoomTestbench onZoom={onZoom} />);

    fireEvent.wheel(screen.getByTestId('zoom-surface'), {
      ctrlKey: true,
      deltaY: -100,
      clientX: 200,
      clientY: 150,
    });

    expect(onZoom).toHaveBeenCalledTimes(1);
    const [factor, anchor] = onZoom.mock.calls[0] as [number, Position];
    expect(factor).toBeGreaterThan(1);
    expect(anchor).toEqual(Position.create(100, 100));
  });

  it('zooms out on ctrl + wheel down', () => {
    const onZoom = jest.fn();
    render(<ZoomTestbench onZoom={onZoom} />);

    fireEvent.wheel(screen.getByTestId('zoom-surface'), {
      ctrlKey: true,
      deltaY: 100,
      clientX: 0,
      clientY: 0,
    });

    const [factor] = onZoom.mock.calls[0] as [number, Position];
    expect(factor).toBeLessThan(1);
  });

  it('supports the meta key for zooming', () => {
    const onZoom = jest.fn();
    render(<ZoomTestbench onZoom={onZoom} />);

    fireEvent.wheel(screen.getByTestId('zoom-surface'), {
      metaKey: true,
      deltaY: -100,
      clientX: 0,
      clientY: 0,
    });

    expect(onZoom).toHaveBeenCalledTimes(1);
  });

  it('prevents the default page scroll when zooming', () => {
    render(<ZoomTestbench onZoom={jest.fn()} />);

    const canceled = fireEvent.wheel(screen.getByTestId('zoom-surface'), {
      ctrlKey: true,
      deltaY: -100,
    });

    expect(canceled).toBe(false);
  });

  it('applies the configured sensitivity', () => {
    const onZoom = jest.fn();
    render(<ZoomTestbench onZoom={onZoom} sensitivity={1} />);

    fireEvent.wheel(screen.getByTestId('zoom-surface'), {
      ctrlKey: true,
      deltaY: -100,
      clientX: 0,
      clientY: 0,
    });

    const [factor] = onZoom.mock.calls[0] as [number, Position];
    expect(factor).toBeCloseTo(Math.E);
  });

  it('uses the default sensitivity when none is provided', () => {
    const onZoom = jest.fn();
    render(<ZoomTestbench onZoom={onZoom} />);

    fireEvent.wheel(screen.getByTestId('zoom-surface'), {
      ctrlKey: true,
      deltaY: -100,
    });

    const [factor] = onZoom.mock.calls[0] as [number, Position];
    expect(factor).toBeCloseTo(Math.exp(DEFAULT_ZOOM_SENSITIVITY));
  });

  it('does not zoom when disabled', () => {
    const onZoom = jest.fn();
    render(<ZoomTestbench onZoom={onZoom} disabled />);

    fireEvent.wheel(screen.getByTestId('zoom-surface'), {
      ctrlKey: true,
      deltaY: -100,
    });

    expect(onZoom).not.toHaveBeenCalled();
  });
});
