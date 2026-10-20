import { fireEvent, render, screen } from '@testing-library/react';
import { createTextElement } from '../../../../../domain/element';
import type { TextElement } from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import { ElementView } from '../../../../../presentation/canvas/renderers';

function createElement(overrides: Partial<{ rotation: number }> = {}): TextElement {
  return createTextElement({
    id: ElementId.create('elem-1'),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(30, 40),
    size: Size.create(120, 80),
    content: 'hello',
    rotation: overrides.rotation,
  });
}

describe('ElementView', () => {
  it('positions the wrapper at the element world bounds', () => {
    render(<ElementView element={createElement()} selected={false} />);

    const wrapper = screen.getByTestId('canvas-item-elem-1');
    expect(wrapper.style.left).toBe('30px');
    expect(wrapper.style.top).toBe('40px');
    expect(wrapper.style.width).toBe('120px');
    expect(wrapper.style.height).toBe('80px');
  });

  it('applies the element rotation and exposes interaction data attributes', () => {
    render(<ElementView element={createElement({ rotation: 45 })} selected={false} />);

    const wrapper = screen.getByTestId('canvas-item-elem-1');
    expect(wrapper.style.transform).toBe('rotate(45deg)');
    expect(wrapper).toHaveAttribute('data-selectable', 'true');
    expect(wrapper).toHaveAttribute('data-element-type', 'text');
    expect(wrapper).toHaveAttribute('data-element-id', 'elem-1');
    expect(wrapper).toHaveAttribute('data-selected', 'false');
  });

  it('reflects the selected state', () => {
    render(<ElementView element={createElement()} selected />);

    expect(screen.getByTestId('canvas-item-elem-1')).toHaveAttribute('data-selected', 'true');
  });

  it('exposes an accessible role and name derived from the element', () => {
    render(<ElementView element={createElement()} selected={false} />);

    expect(screen.getByRole('group', { name: 'Text: hello' })).toBeInTheDocument();
  });

  it('marks the selected element as current for assistive technology', () => {
    render(<ElementView element={createElement()} selected />);

    expect(screen.getByTestId('canvas-item-elem-1')).toHaveAttribute('aria-current', 'true');
  });

  it('prefers an explicit accessible name when provided', () => {
    render(<ElementView element={createElement()} selected={false} ariaLabel="Custom label" />);

    expect(screen.getByRole('group', { name: 'Custom label' })).toBeInTheDocument();
  });

  it('uses the built-in renderer for a known element type', () => {
    render(<ElementView element={createElement()} selected={false} />);

    const wrapper = screen.getByTestId('canvas-item-elem-1');
    expect(wrapper.querySelector('[data-element-content]')?.textContent).toBe('hello');
    expect(wrapper.querySelector('[data-element-fallback]')).toBeNull();
  });

  it('delegates the content to the registered renderer', () => {
    render(
      <ElementView
        element={createElement()}
        selected={false}
        renderers={{ text: () => <span data-testid="custom-text" /> }}
      />,
    );

    expect(screen.getByTestId('custom-text')).toBeInTheDocument();
    expect(
      screen.getByTestId('canvas-item-elem-1').querySelector('[data-element-fallback]'),
    ).toBeNull();
  });

  it('shows an unresolved comment indicator and opens comments from it', () => {
    const onOpenComments = jest.fn();
    render(
      <ElementView
        element={createElement()}
        selected={false}
        commentCount={2}
        commentLabel="2 unresolved comments"
        onOpenComments={onOpenComments}
      />,
    );

    const indicator = screen.getByRole('button', { name: '2 unresolved comments' });
    expect(indicator).toHaveTextContent('2');

    fireEvent.click(indicator);

    expect(onOpenComments).toHaveBeenCalledWith('elem-1');
  });

  it('does not render the comment indicator without unresolved comments', () => {
    render(<ElementView element={createElement()} selected={false} commentCount={0} />);

    expect(screen.queryByTestId('comment-indicator-elem-1')).not.toBeInTheDocument();
  });
});
