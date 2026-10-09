import { fireEvent, render, screen } from '@testing-library/react';
import { type ReactElement } from 'react';
import { useSpacePressed } from '../../../../../presentation/canvas/hooks/use-space-pressed';

function SpacePressedTestbench(): ReactElement {
  const pressed = useSpacePressed();

  return (
    <div data-testid="surface" data-pressed={pressed}>
      <input data-testid="editor" />
    </div>
  );
}

describe('useSpacePressed', () => {
  it('starts as not pressed', () => {
    render(<SpacePressedTestbench />);

    expect(screen.getByTestId('surface')).toHaveAttribute('data-pressed', 'false');
  });

  it('reports pressed while the space key is held', () => {
    render(<SpacePressedTestbench />);

    fireEvent.keyDown(window, { code: 'Space' });

    expect(screen.getByTestId('surface')).toHaveAttribute('data-pressed', 'true');

    fireEvent.keyUp(window, { code: 'Space' });

    expect(screen.getByTestId('surface')).toHaveAttribute('data-pressed', 'false');
  });

  it('ignores non-space keys', () => {
    render(<SpacePressedTestbench />);

    fireEvent.keyDown(window, { code: 'KeyA' });

    expect(screen.getByTestId('surface')).toHaveAttribute('data-pressed', 'false');
  });

  it('ignores the space key while editing a field', () => {
    render(<SpacePressedTestbench />);

    fireEvent.keyDown(screen.getByTestId('editor'), { code: 'Space' });

    expect(screen.getByTestId('surface')).toHaveAttribute('data-pressed', 'false');
  });

  it('releases the space key on window blur', () => {
    render(<SpacePressedTestbench />);

    fireEvent.keyDown(window, { code: 'Space' });
    fireEvent.blur(window);

    expect(screen.getByTestId('surface')).toHaveAttribute('data-pressed', 'false');
  });
});
