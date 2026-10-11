import { render, screen } from '@testing-library/react';
import { createConnectorElement, createTextElement } from '../../../../../domain/element';
import type { ConnectorElement } from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import { ConnectorRenderer, ElementView } from '../../../../../presentation/canvas/renderers';

function createElement(): ConnectorElement {
  return createConnectorElement({
    id: ElementId.create('connector-1'),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(10, 20),
    size: Size.create(240, 120),
    sourceElementId: ElementId.create('elem-a'),
    targetElementId: ElementId.create('elem-b'),
  });
}

describe('ConnectorRenderer', () => {
  it('exposes the content node with a data attribute', () => {
    render(<ConnectorRenderer element={createElement()} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content).not.toBeNull();
    expect(content).toHaveAttribute('data-element-type', 'connector');
  });

  it('exposes the connector endpoints as data attributes', () => {
    render(<ConnectorRenderer element={createElement()} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content).toHaveAttribute('data-connector-source', 'elem-a');
    expect(content).toHaveAttribute('data-connector-target', 'elem-b');
  });

  it('renders a line from the source to the target', () => {
    render(<ConnectorRenderer element={createElement()} selected={false} />);

    const line = document.querySelector('[data-connector-line]');
    expect(line).not.toBeNull();
    expect(line).toHaveAttribute('x1', '2%');
    expect(line).toHaveAttribute('y1', '2%');
    expect(line).toHaveAttribute('x2', '98%');
    expect(line).toHaveAttribute('y2', '98%');
  });

  it('wires the line to an arrow marker', () => {
    render(<ConnectorRenderer element={createElement()} selected={false} />);

    const arrow = document.querySelector('[data-connector-arrow]');
    expect(arrow).not.toBeNull();
    expect(arrow).toHaveAttribute('id', 'connector-arrow-connector-1');

    const line = document.querySelector('[data-connector-line]');
    expect(line).toHaveAttribute('marker-end', 'url(#connector-arrow-connector-1)');
  });

  it('returns null for a non-connector element', () => {
    const text = createTextElement({
      id: ElementId.create('elem-2'),
      workspaceId: WorkspaceId.create('ws-1'),
      createdBy: UserId.create('user-1'),
      position: Position.create(0, 0),
      size: Size.create(10, 10),
      content: 'text',
    });

    const { container } = render(<ConnectorRenderer element={text} selected={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('delegates to the renderer through ElementView', () => {
    render(
      <ElementView
        element={createElement()}
        selected={false}
        renderers={{ connector: ConnectorRenderer }}
      />,
    );

    const wrapper = screen.getByTestId('canvas-item-connector-1');
    expect(wrapper.querySelector('[data-element-content]')).not.toBeNull();
    expect(wrapper.querySelector('[data-element-fallback]')).toBeNull();
  });
});
