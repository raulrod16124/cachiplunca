import type { ComponentProps } from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../../setup/render-with-theme';
import {
  createCanvasViewportStore,
  MAX_CANVAS_SCALE,
  MIN_CANVAS_SCALE,
} from '../../../../../application/services';
import { Position, Size } from '../../../../../domain/shared';
import {
  ViewportControls,
  scaleToSliderValue,
  sliderValueToScale,
} from '../../../../../presentation/canvas/components/viewport-controls';

type ControlsProps = ComponentProps<typeof ViewportControls>;

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

function renderControls(overrides: Partial<ControlsProps> = {}) {
  const store = createCanvasViewportStore(Size.create(800, 600));
  const onUndo = jest.fn();
  const onRedo = jest.fn();

  render(<ViewportControls store={store} onUndo={onUndo} onRedo={onRedo} {...overrides} />);

  return { store, onUndo, onRedo };
}

describe('ViewportControls', () => {
  it('shows the current zoom percentage', () => {
    renderControls();

    expect(screen.getByTestId('zoom-level')).toHaveTextContent('100%');
  });

  it('floats at the bottom center of the canvas', () => {
    renderControls();

    const controls = screen.getByTestId('viewport-controls');
    expect(controls).toHaveStyle({ left: '50%' });
    expect(styleText()).toContain('bottom:var(--rr-space-4)');
  });

  it('uses brand spacing and focus tokens', () => {
    renderControls();

    const css = styleText();
    expect(css).toContain('var(--rr-space-4)');
    expect(css).toContain('var(--rr-space-2)');
    expect(css).toContain('var(--rr-color-focus-ring)');
    expect(css).toContain('var(--cach-control-hover)');
    expect(css).not.toContain('var(--rr-color-action-secondary-background)');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('disables undo and redo by default', () => {
    renderControls();

    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });

  it('forwards undo and redo clicks when they are available', async () => {
    const user = userEvent.setup();
    const { onUndo, onRedo } = renderControls({ canUndo: true, canRedo: true });

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await user.click(screen.getByRole('button', { name: 'Redo' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('resets the viewport through the reset view button', async () => {
    const user = userEvent.setup();
    const { store } = renderControls();

    act(() => store.pan(Position.create(50, 30)));
    await user.click(screen.getByRole('button', { name: 'Reset view' }));

    expect(store.getSnapshot().transform.translation).toEqual(Position.create(0, 0));
    expect(screen.getByTestId('zoom-level')).toHaveTextContent('100%');
  });

  it('renders zoom out and zoom in controls', () => {
    renderControls();

    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeEnabled();
  });

  it('zooms in and out in predictable steps', async () => {
    const user = userEvent.setup();
    const { store } = renderControls();

    await user.click(screen.getByRole('button', { name: 'Zoom in' }));

    expect(store.getSnapshot().scale).toBeCloseTo(1.2);
    expect(screen.getByTestId('zoom-level')).toHaveTextContent('120%');

    await user.click(screen.getByRole('button', { name: 'Zoom out' }));

    expect(store.getSnapshot().scale).toBeCloseTo(1);
    expect(screen.getByTestId('zoom-level')).toHaveTextContent('100%');
  });

  it('disables zoom controls at the scale limits', () => {
    const { store } = renderControls();

    act(() => store.setScale(MIN_CANVAS_SCALE));

    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeEnabled();

    act(() => store.setScale(MAX_CANVAS_SCALE));

    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
  });

  describe('zoom slider', () => {
    it('opens a slider popover when the zoom percentage is clicked', async () => {
      const user = userEvent.setup();
      renderControls();

      expect(screen.queryByRole('slider')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('zoom-level'));

      expect(screen.getByRole('dialog', { name: 'Zoom' })).toBeInTheDocument();
      expect(screen.getByRole('slider', { name: 'Zoom level' })).toBeInTheDocument();
      expect(screen.getByRole('slider')).toHaveValue(String(scaleToSliderValue(1)));
    });

    it('adjusts the zoom level while dragging and keeps it after releasing', async () => {
      const user = userEvent.setup();
      const { store } = renderControls();

      await user.click(screen.getByTestId('zoom-level'));
      const slider = screen.getByRole('slider');

      fireEvent.change(slider, { target: { value: String(scaleToSliderValue(2)) } });

      expect(store.getSnapshot().scale).toBeCloseTo(2);
      expect(screen.getByTestId('zoom-level')).toHaveTextContent('200%');

      fireEvent.blur(slider);

      expect(store.getSnapshot().scale).toBeCloseTo(2);
      expect(screen.getByTestId('zoom-level')).toHaveTextContent('200%');
    });

    it('reflects zoom changes made outside the slider', async () => {
      const user = userEvent.setup();
      const { store } = renderControls();

      act(() => store.setScale(0.25));
      await user.click(screen.getByTestId('zoom-level'));

      expect(screen.getByTestId('zoom-level')).toHaveTextContent('25%');
      expect(screen.getByRole('slider')).toHaveValue(String(scaleToSliderValue(0.25)));
    });
  });

  describe('zoom slider scale mapping', () => {
    it('maps the slider ends to the allowed scale range', () => {
      expect(sliderValueToScale(0)).toBe(MIN_CANVAS_SCALE);
      expect(sliderValueToScale(1000)).toBeCloseTo(MAX_CANVAS_SCALE);
      expect(scaleToSliderValue(MIN_CANVAS_SCALE)).toBe(0);
      expect(scaleToSliderValue(MAX_CANVAS_SCALE)).toBe(1000);
    });

    it('round-trips a scale through the slider', () => {
      expect(sliderValueToScale(scaleToSliderValue(2))).toBeCloseTo(2);
      expect(scaleToSliderValue(sliderValueToScale(400))).toBe(400);
    });
  });
});
