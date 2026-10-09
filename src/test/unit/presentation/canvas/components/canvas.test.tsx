import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Size } from '../../../../../domain/shared';
import { createCanvasViewportStore } from '../../../../../application/services';
import { Canvas } from '../../../../../presentation/canvas/components/canvas';

describe('Canvas', () => {
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

  it('renders the canvas with a grid and a hint', () => {
    const store = createCanvasViewportStore(Size.create(800, 600));
    render(<Canvas store={store} />);

    expect(screen.getByRole('application', { name: 'Canvas' })).toBeInTheDocument();
    expect(screen.getByText('Drag to pan · Ctrl/Cmd + scroll to zoom')).toBeInTheDocument();
  });

  it('pans the viewport when dragging', async () => {
    const store = createCanvasViewportStore(Size.create(800, 600));
    render(<Canvas store={store} />);
    const canvas = screen.getByRole('application', { name: 'Canvas' });
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { x: 0, y: 0 } },
      { coords: { x: 50, y: 25 } },
    ]);

    const world = canvas.firstChild as HTMLElement;
    expect(world.style.transform).toContain('translate(50px, 25px)');
    expect(world.style.transform).toContain('scale(1)');
  });

  it('releases the panning state after dragging', async () => {
    const store = createCanvasViewportStore(Size.create(800, 600));
    render(<Canvas store={store} />);
    const canvas = screen.getByRole('application', { name: 'Canvas' });
    const user = userEvent.setup();

    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { x: 0, y: 0 } },
      { coords: { x: 10, y: 10 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(canvas).toHaveAttribute('data-panning', 'false');
  });

  it('zooms the viewport on ctrl + wheel', () => {
    const store = createCanvasViewportStore(Size.create(800, 600));
    render(<Canvas store={store} />);
    const canvas = screen.getByRole('application', { name: 'Canvas' });

    fireEvent.wheel(canvas, { ctrlKey: true, deltaY: -100, clientX: 200, clientY: 150 });

    const world = canvas.firstChild as HTMLElement;
    expect(world.style.transform).not.toContain('scale(1)');
    expect(Number(canvas.getAttribute('data-scale'))).toBeGreaterThan(1);
  });

  it('does not zoom on a plain wheel', () => {
    const store = createCanvasViewportStore(Size.create(800, 600));
    render(<Canvas store={store} />);
    const canvas = screen.getByRole('application', { name: 'Canvas' });

    fireEvent.wheel(canvas, { deltaY: -100 });

    expect(Number(canvas.getAttribute('data-scale'))).toBe(1);
  });

  it('shows the current zoom percentage', () => {
    const store = createCanvasViewportStore(Size.create(800, 600));
    render(<Canvas store={store} />);
    const canvas = screen.getByRole('application', { name: 'Canvas' });

    expect(screen.getByLabelText('Zoom level')).toHaveTextContent('100%');

    fireEvent.wheel(canvas, { ctrlKey: true, deltaY: -100, clientX: 200, clientY: 150 });

    expect(screen.getByLabelText('Zoom level')).not.toHaveTextContent('100%');
  });

  it('resets the viewport when clicking reset view', async () => {
    const store = createCanvasViewportStore(Size.create(800, 600));
    render(<Canvas store={store} />);
    const canvas = screen.getByRole('application', { name: 'Canvas' });
    const user = userEvent.setup();

    fireEvent.wheel(canvas, { ctrlKey: true, deltaY: -100, clientX: 200, clientY: 150 });
    expect(Number(canvas.getAttribute('data-scale'))).toBeGreaterThan(1);

    await user.click(screen.getByRole('button', { name: 'Reset view' }));

    const world = canvas.firstChild as HTMLElement;
    expect(Number(canvas.getAttribute('data-scale'))).toBe(1);
    expect(world.style.transform).toContain('translate(0px, 0px)');
    expect(screen.getByLabelText('Zoom level')).toHaveTextContent('100%');
  });
});
