import { fireEvent, render, screen } from '@testing-library/react';
import { type ReactElement } from 'react';
import { useCanvasFocus } from '../../../../../presentation/canvas/hooks/use-canvas-focus';

interface FocusTestbenchProps {
  readonly disabled?: boolean;
}

function FocusTestbench({ disabled = false }: FocusTestbenchProps): ReactElement {
  const { ref } = useCanvasFocus({ disabled });

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      data-testid="surface"
      role="application"
      aria-label="Canvas"
      tabIndex={0}
    >
      <button type="button">Action</button>
    </div>
  );
}

describe('useCanvasFocus', () => {
  it('focuses the surface when pressing on a non-interactive area', () => {
    render(<FocusTestbench />);

    const surface = screen.getByTestId('surface');
    fireEvent.pointerDown(surface, { button: 0 });

    expect(surface).toHaveFocus();
  });

  it('does not steal focus when pressing an interactive target', () => {
    render(<FocusTestbench />);

    const surface = screen.getByTestId('surface');
    const button = screen.getByRole('button', { name: 'Action' });
    fireEvent.pointerDown(button, { button: 0 });

    expect(surface).not.toHaveFocus();
  });

  it('does nothing when disabled', () => {
    render(<FocusTestbench disabled />);

    const surface = screen.getByTestId('surface');
    fireEvent.pointerDown(surface, { button: 0 });

    expect(surface).not.toHaveFocus();
  });

  it('removes the listener on unmount', () => {
    const { unmount } = render(<FocusTestbench />);

    const surface = screen.getByTestId('surface');
    unmount();
    fireEvent.pointerDown(surface, { button: 0 });

    expect(surface).not.toHaveFocus();
  });
});
