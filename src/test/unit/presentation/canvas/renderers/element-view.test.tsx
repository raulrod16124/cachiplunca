import { fireEvent, render, screen } from '@testing-library/react';
import {
  createConnectorElement,
  createFrameElement,
  createImageElement,
  createLinkElement,
  createNoteElement,
  createTaskElement,
  createTextElement,
} from '../../../../../domain/element';
import type { Element, ElementType, TextElement } from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import { ElementView } from '../../../../../presentation/canvas/renderers';

const BASE_PROPS = {
  id: ElementId.create('elem-1'),
  workspaceId: WorkspaceId.create('ws-1'),
  createdBy: UserId.create('user-1'),
  position: Position.create(30, 40),
  size: Size.create(120, 80),
} as const;

const TYPE_PROPS = {
  ...BASE_PROPS,
  id: ElementId.create('label-element'),
};

function createElement(overrides: Partial<{ rotation: number }> = {}): TextElement {
  return createTextElement({
    ...BASE_PROPS,
    content: 'hello',
    rotation: overrides.rotation,
  });
}

function createElementOfType(type: ElementType): Element {
  switch (type) {
    case 'text':
      return createTextElement({ ...TYPE_PROPS, content: 'hello' });
    case 'note':
      return createNoteElement({ ...TYPE_PROPS, content: 'note' });
    case 'task':
      return createTaskElement({ ...TYPE_PROPS, title: 'task', status: 'todo' });
    case 'frame':
      return createFrameElement({ ...TYPE_PROPS, title: 'frame' });
    case 'connector':
      return createConnectorElement({
        ...TYPE_PROPS,
        sourcePoint: Position.create(30, 40),
        targetPoint: Position.create(150, 120),
      });
    case 'link':
      return createLinkElement({ ...TYPE_PROPS, url: 'https://example.com' });
    case 'image':
      return createImageElement({ ...TYPE_PROPS, src: 'https://example.com/image.png' });
  }
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

  it.each([
    ['text', 'Text'],
    ['note', 'Note'],
    ['task', 'Task'],
    ['frame', 'Frame'],
    ['connector', 'Connector'],
    ['link', 'Link'],
    ['image', 'Image'],
  ] as const)('renders the type label for %s elements', (type, expected) => {
    render(<ElementView element={createElementOfType(type)} selected={false} />);

    expect(screen.getByTestId('element-type-label-label-element')).toHaveTextContent(expected);
  });

  it('keeps the type label hidden while the element is idle', () => {
    render(<ElementView element={createElement()} selected={false} />);

    expect(screen.getByTestId('element-type-label-elem-1')).toHaveStyle({ opacity: '0' });
  });

  it('reveals the type label when the element is selected', () => {
    render(<ElementView element={createElement()} selected />);

    expect(screen.getByTestId('element-type-label-elem-1')).toHaveStyle({ opacity: '1' });
  });

  it('hides the type label when requested', () => {
    render(<ElementView element={createElement()} selected={false} showTypeLabel={false} />);

    expect(screen.queryByTestId('element-type-label-elem-1')).not.toBeInTheDocument();
  });

  it('keeps the type label decorative and outside the accessible name', () => {
    render(<ElementView element={createElement()} selected={false} />);

    expect(screen.getByTestId('element-type-label-elem-1')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('group', { name: 'Text: hello' })).toBeInTheDocument();
  });

  it('places the connector type label at the segment midpoint', () => {
    const connector = createConnectorElement({
      ...BASE_PROPS,
      sourcePoint: Position.create(30, 40),
      targetPoint: Position.create(270, 160),
    });

    render(
      <ElementView
        element={connector}
        selected={false}
        connectorStart={Position.create(30, 40)}
        connectorEnd={Position.create(270, 160)}
      />,
    );

    const label = screen.getByTestId('element-type-label-elem-1');
    expect(label.style.left).toBe('120px');
    expect(label.style.top).toBe('60px');
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
