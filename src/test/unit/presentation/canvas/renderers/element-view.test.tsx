import { render, screen } from '@testing-library/react';
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

  it('uses the default renderer as fallback', () => {
    render(<ElementView element={createElement()} selected={false} />);

    expect(
      screen.getByTestId('canvas-item-elem-1').querySelector('[data-element-fallback]'),
    ).not.toBeNull();
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
});
