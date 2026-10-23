import { render, screen } from '@testing-library/react';
import { Bounds, Position } from '../../../../../domain/shared';
import type { SelectableItem } from '../../../../../application/services';
import { SelectionOverlay } from '../../../../../presentation/canvas/components/selection-overlay';

function item(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation?: number,
): SelectableItem {
  return { id, bounds: Bounds.fromXYWH(x, y, width, height), rotation };
}

function styleText(): string {
  return [...document.head.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('');
}

describe('SelectionOverlay', () => {
  it('renders nothing without items', () => {
    render(<SelectionOverlay items={[]} />);

    expect(screen.queryByTestId('selection-overlay')).not.toBeInTheDocument();
  });

  it('renders the eight resize handles for a single item', () => {
    render(<SelectionOverlay items={[item('a', 10, 20, 100, 40)]} />);

    const overlay = screen.getByTestId('selection-overlay');
    const handles = overlay.querySelectorAll('[data-resize-handle]');

    expect(handles).toHaveLength(8);
    expect(overlay.querySelectorAll('span')).toHaveLength(8);
  });

  it('exposes the anchor of each handle', () => {
    render(<SelectionOverlay items={[item('a', 10, 20, 100, 40)]} />);

    const overlay = screen.getByTestId('selection-overlay');
    const anchors = Array.from(overlay.querySelectorAll('[data-resize-anchor]')).map((handle) =>
      handle.getAttribute('data-resize-anchor'),
    );

    expect(anchors).toEqual([
      'top-left',
      'top',
      'top-right',
      'right',
      'bottom-right',
      'bottom',
      'bottom-left',
      'left',
    ]);
  });

  it('paints the selection with brand tokens', () => {
    render(<SelectionOverlay items={[item('a', 10, 20, 100, 40)]} />);

    const css = styleText();
    expect(css).toContain('var(--rr-color-border-primary)');
    expect(css).toContain('var(--rr-color-action-primary-background)');
    expect(css).toContain('var(--rr-radius-sm)');
    expect(css).toContain('var(--rr-shadow-sm)');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('does not render resize handles for multiple items', () => {
    render(<SelectionOverlay items={[item('a', 0, 0, 100, 40), item('b', 100, 0, 100, 40)]} />);

    const overlay = screen.getByTestId('selection-overlay');

    expect(overlay).toHaveAttribute('data-selection-count', '2');
    expect(overlay.querySelectorAll('[data-resize-handle]')).toHaveLength(0);
  });

  it('rotates the overlay with the element', () => {
    render(<SelectionOverlay items={[item('a', 10, 20, 100, 40, 45)]} canRotate />);

    const overlay = screen.getByTestId('selection-overlay');

    expect(overlay).toHaveAttribute('data-rotation', '45');
    expect(overlay.style.transform).toBe('rotate(45deg)');
  });

  it('renders an accessible rotation handle for a single rotatable item', () => {
    render(<SelectionOverlay items={[item('a', 10, 20, 100, 40)]} canRotate />);

    const handle = screen.getByRole('button', { name: 'Rotate element' });

    expect(handle).toHaveAttribute('data-rotate-handle', 'true');
    expect(handle).toHaveAttribute('data-testid', 'rotate-handle');
  });

  it('uses a rotation cursor with a grab fallback for the rotation handle', () => {
    render(<SelectionOverlay items={[item('a', 10, 20, 100, 40)]} canRotate />);

    const css = styleText();
    expect(css).toMatch(/cursor:\s*url\("data:image\/svg/);
    expect(css).toMatch(/12 12,\s*grab/);
  });

  it('keeps resize cursors independent from the rotation cursor', () => {
    render(<SelectionOverlay items={[item('a', 10, 20, 100, 40)]} canRotate />);

    const overlay = screen.getByTestId('selection-overlay');
    const topLeft = overlay.querySelector('[data-resize-anchor="top-left"]');

    expect(topLeft).toHaveStyle({ cursor: 'nwse-resize' });
  });

  it('does not render the rotation handle when rotation is unavailable', () => {
    render(<SelectionOverlay items={[item('a', 10, 20, 100, 40)]} />);

    expect(screen.queryByTestId('rotate-handle')).not.toBeInTheDocument();
  });

  it('does not render the rotation handle for a connector', () => {
    render(
      <SelectionOverlay
        items={[
          {
            id: 'connector',
            bounds: Bounds.fromXYWH(0, 0, 100, 100),
            segment: {
              start: Position.create(0, 0),
              end: Position.create(100, 100),
            },
          },
        ]}
        canRotate
      />,
    );

    expect(screen.queryByTestId('rotate-handle')).not.toBeInTheDocument();
  });
});
