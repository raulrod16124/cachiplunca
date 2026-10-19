import { render, screen } from '@testing-library/react';
import {
  createLinkElement,
  createTextElement,
  DEFAULT_TEXT_ALIGN,
} from '../../../../../domain/element';
import type { LinkElement, RichTextDocument } from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import { ElementView, LinkRenderer } from '../../../../../presentation/canvas/renderers';

function createElement(url: string, title?: string | RichTextDocument): LinkElement {
  return createLinkElement({
    id: ElementId.create('link-1'),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(10, 20),
    size: Size.create(240, 120),
    url,
    title,
  });
}

describe('LinkRenderer', () => {
  it('renders the url', () => {
    render(<LinkRenderer element={createElement('https://example.com')} selected={false} />);

    expect(screen.getByText('https://example.com')).toBeInTheDocument();
  });

  it('renders the title when present', () => {
    const element = createElement('https://example.com', 'Example');

    render(<LinkRenderer element={element} selected={false} />);

    const title = document.querySelector('[data-link-title]');
    expect(title).not.toBeNull();
    expect(title?.textContent).toBe('Example');
  });

  it('omits the title when absent', () => {
    render(<LinkRenderer element={createElement('https://example.com')} selected={false} />);

    expect(document.querySelector('[data-link-title]')).toBeNull();
  });

  it('exposes the content node with data attributes', () => {
    render(<LinkRenderer element={createElement('https://example.com')} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content).not.toBeNull();
    expect(content).toHaveAttribute('data-element-type', 'link');
    expect(content).toHaveAttribute('data-link-url', 'https://example.com');
  });

  it('delimits the container with a soft border', () => {
    render(<LinkRenderer element={createElement('https://example.com')} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content).toHaveStyle({ borderTopWidth: '1px', borderTopStyle: 'solid' });
  });

  it('returns null for a non-link element', () => {
    const text = createTextElement({
      id: ElementId.create('elem-2'),
      workspaceId: WorkspaceId.create('ws-1'),
      createdBy: UserId.create('user-1'),
      position: Position.create(0, 0),
      size: Size.create(10, 10),
      content: 'text',
    });

    const { container } = render(<LinkRenderer element={text} selected={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the title with inline marks', () => {
    const doc: RichTextDocument = {
      blocks: [
        {
          type: 'paragraph',
          align: DEFAULT_TEXT_ALIGN,
          spans: [{ text: 'Example', marks: { underline: true } }],
        },
      ],
    };

    render(<LinkRenderer element={createElement('https://example.com', doc)} selected={false} />);

    expect(screen.getByText('Example')).toHaveStyle({ textDecoration: 'underline' });
  });

  it('renders only the first text block and never lists in the title', () => {
    const doc: RichTextDocument = {
      blocks: [
        { type: 'heading', level: 2, align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'Docs' }] },
        {
          type: 'orderedList',
          items: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'listed' }] },
              ],
            },
          ],
        },
      ],
    };
    const element: LinkElement = { ...createElement('https://example.com'), title: doc };

    const { container } = render(<LinkRenderer element={element} selected={false} />);

    const title = document.querySelector('[data-link-title]');
    expect(title).not.toBeNull();
    expect(title?.textContent).toBe('Docs');
    expect(container.querySelector('ol')).toBeNull();
    expect(container.querySelector('h2')).toBeNull();
  });

  it('delegates to the renderer through ElementView', () => {
    render(
      <ElementView
        element={createElement('https://example.com', 'Example')}
        selected={false}
        renderers={{ link: LinkRenderer }}
      />,
    );

    const wrapper = screen.getByTestId('canvas-item-link-1');
    expect(wrapper).toHaveTextContent('https://example.com');
    expect(wrapper.querySelector('[data-link-title]')).toHaveTextContent('Example');
    expect(wrapper.querySelector('[data-element-fallback]')).toBeNull();
  });
});
