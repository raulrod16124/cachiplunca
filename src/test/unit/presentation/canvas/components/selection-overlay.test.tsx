import { render, screen } from '@testing-library/react';
import { Bounds } from '../../../../../domain/shared';
import type { SelectableItem } from '../../../../../application/services';
import { SelectionOverlay } from '../../../../../presentation/canvas/components/selection-overlay';

function item(id: string, x: number, y: number, width: number, height: number): SelectableItem {
  return { id, bounds: Bounds.fromXYWH(x, y, width, height) };
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

  it('does not render resize handles for multiple items', () => {
    render(<SelectionOverlay items={[item('a', 0, 0, 100, 40), item('b', 100, 0, 100, 40)]} />);

    const overlay = screen.getByTestId('selection-overlay');

    expect(overlay).toHaveAttribute('data-selection-count', '2');
    expect(overlay.querySelectorAll('[data-resize-handle]')).toHaveLength(0);
  });
});
