import { render, screen } from '@testing-library/react';
import type { RemoteCursor } from '../../../../../application/services';
import { Position, Size, Transform, Viewport } from '../../../../../domain/shared';
import { RemoteCursorsOverlay } from '../../../../../presentation/canvas/components/remote-cursors-overlay';

const VIEWPORT = Viewport.default(Size.create(800, 600));

function cursor(userId: string, x: number, y: number): RemoteCursor {
  return { userId, position: Position.create(x, y), lastSeenAt: new Date() };
}

describe('RemoteCursorsOverlay', () => {
  it('renders nothing without cursors', () => {
    render(<RemoteCursorsOverlay cursors={[]} viewport={VIEWPORT} />);

    expect(screen.queryByTestId('remote-cursors-overlay')).not.toBeInTheDocument();
  });

  it('renders one cursor per remote user', () => {
    render(
      <RemoteCursorsOverlay
        cursors={[cursor('user-1', 10, 20), cursor('user-2', 30, 40)]}
        viewport={VIEWPORT}
      />,
    );

    expect(screen.getAllByTestId('remote-cursor')).toHaveLength(2);
    expect(screen.getByTestId('remote-cursors-overlay')).toHaveAttribute('aria-hidden', 'true');
  });

  it('positions each cursor using the viewport projection', () => {
    const viewport = Viewport.create(
      Transform.create(Position.create(10, 5), 2),
      Size.create(100, 100),
    );

    render(<RemoteCursorsOverlay cursors={[cursor('user-1', 20, 15)]} viewport={viewport} />);

    const element = screen.getByTestId('remote-cursor');
    expect(element).toHaveStyle({ left: '20px', top: '20px' });
    expect(element).toHaveAttribute('data-user-id', 'user-1');
  });

  it('labels each cursor with a short form of the user id', () => {
    render(
      <RemoteCursorsOverlay cursors={[cursor('abcdefghijklmnop', 0, 0)]} viewport={VIEWPORT} />,
    );

    expect(screen.getByTestId('remote-cursor')).toHaveTextContent('ijklmnop');
  });
});
