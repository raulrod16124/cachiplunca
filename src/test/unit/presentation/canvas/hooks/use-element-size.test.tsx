import { act, render, screen } from '@testing-library/react';
import { type ReactElement } from 'react';
import { useElementSize } from '../../../../../presentation/canvas/hooks/use-element-size';

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];

  readonly observed: Element[] = [];
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.observed.push(target);
  }

  unobserve(): void {}

  disconnect(): void {
    this.observed.length = 0;
  }

  trigger(): void {
    this.callback([], this as unknown as ResizeObserver);
  }
}

function Testbench(): ReactElement {
  const { size, ref } = useElementSize();

  return (
    <div
      ref={ref}
      data-testid="surface"
      data-width={size === null ? '' : size.width}
      data-height={size === null ? '' : size.height}
    />
  );
}

describe('useElementSize', () => {
  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  const originalResizeObserver = globalThis.ResizeObserver;

  beforeEach(() => {
    MockResizeObserver.instances = [];
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    globalThis.ResizeObserver = originalResizeObserver;
  });

  it('returns null when the element has no measurable size (e.g. jsdom)', () => {
    render(<Testbench />);

    expect(screen.getByTestId('surface')).toHaveAttribute('data-width', '');
  });

  it('measures the element size on mount', () => {
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 1280,
      height: 800,
    })) as unknown as () => DOMRect;

    render(<Testbench />);

    const surface = screen.getByTestId('surface');
    expect(surface).toHaveAttribute('data-width', '1280');
    expect(surface).toHaveAttribute('data-height', '800');
  });

  it('updates the size when the element resizes', () => {
    let width = 800;
    let height = 600;

    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width,
      height,
    })) as unknown as () => DOMRect;

    render(<Testbench />);
    expect(screen.getByTestId('surface')).toHaveAttribute('data-width', '800');

    const observer = MockResizeObserver.instances[0];
    expect(observer?.observed).toHaveLength(1);

    width = 1000;
    height = 700;
    act(() => {
      observer?.trigger();
    });

    const surface = screen.getByTestId('surface');
    expect(surface).toHaveAttribute('data-width', '1000');
    expect(surface).toHaveAttribute('data-height', '700');
  });

  it('disconnects the observer on unmount', () => {
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 800,
      height: 600,
    })) as unknown as () => DOMRect;

    const { unmount } = render(<Testbench />);
    const observer = MockResizeObserver.instances[0];
    const disconnect = jest.spyOn(observer as MockResizeObserver, 'disconnect');

    unmount();

    expect(disconnect).toHaveBeenCalled();
  });
});
