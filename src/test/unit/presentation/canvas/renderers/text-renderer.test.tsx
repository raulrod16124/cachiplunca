import { render, screen } from '@testing-library/react';
import {
  createNoteElement,
  createTextElement,
  DEFAULT_TEXT_ALIGN,
} from '../../../../../domain/element';
import type { RichTextDocument, TextElement } from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import { ElementView, TextRenderer } from '../../../../../presentation/canvas/renderers';

function createElement(
  content: string | RichTextDocument,
  overrides: Partial<{ rotation: number }> = {},
): TextElement {
  return createTextElement({
    id: ElementId.create('elem-1'),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(30, 40),
    size: Size.create(120, 80),
    content,
    rotation: overrides.rotation,
  });
}

describe('TextRenderer', () => {
  it('renders the element content', () => {
    render(<TextRenderer element={createElement('hello')} selected={false} />);

    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('exposes the content node with a data attribute', () => {
    render(<TextRenderer element={createElement('hello')} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content).not.toBeNull();
    expect(content).toHaveAttribute('data-element-type', 'text');
  });

  it('preserves whitespace and line breaks', () => {
    render(<TextRenderer element={createElement('line one\nline two')} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content?.textContent).toBe('line one\nline two');
  });

  it('renders empty content without crashing', () => {
    render(<TextRenderer element={createElement('')} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content).not.toBeNull();
    expect(content?.textContent).toBe('');
  });

  it('delimits the container with a soft border', () => {
    render(<TextRenderer element={createElement('hello')} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content).toHaveStyle({ borderTopWidth: '1px', borderTopStyle: 'solid' });
  });

  it('shows a pointer cursor over the element', () => {
    render(<TextRenderer element={createElement('hello')} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content).toHaveStyle({ cursor: 'pointer' });
  });

  it('returns null for a non-text element', () => {
    const note = createNoteElement({
      id: ElementId.create('elem-2'),
      workspaceId: WorkspaceId.create('ws-1'),
      createdBy: UserId.create('user-1'),
      position: Position.create(0, 0),
      size: Size.create(10, 10),
      content: 'note',
    });

    const { container } = render(<TextRenderer element={note} selected={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders heading blocks as heading elements', () => {
    const doc: RichTextDocument = {
      blocks: [
        { type: 'heading', level: 1, align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'Section' }] },
      ],
    };

    render(<TextRenderer element={createElement(doc)} selected={false} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Section' })).toBeInTheDocument();
  });

  it('renders list blocks as lists', () => {
    const doc: RichTextDocument = {
      blocks: [
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'item one' }] },
              ],
            },
          ],
        },
      ],
    };

    const { container } = render(<TextRenderer element={createElement(doc)} selected={false} />);

    expect(container.querySelector('ul li')).not.toBeNull();
    expect(screen.getByText('item one')).toBeInTheDocument();
  });

  it('renders italic and highlight marks', () => {
    const doc: RichTextDocument = {
      blocks: [
        {
          type: 'paragraph',
          align: DEFAULT_TEXT_ALIGN,
          spans: [
            { text: 'fancy', marks: { italic: true } },
            { text: 'glow', marks: { highlight: true } },
          ],
        },
      ],
    };

    const { container } = render(<TextRenderer element={createElement(doc)} selected={false} />);

    expect(screen.getByText('fancy')).toHaveStyle({ fontStyle: 'italic' });
    expect(container.querySelector('mark')).toHaveTextContent('glow');
  });

  it('delegates to the renderer through ElementView', () => {
    render(
      <ElementView
        element={createElement('hello')}
        selected={false}
        renderers={{ text: TextRenderer }}
      />,
    );

    const wrapper = screen.getByTestId('canvas-item-elem-1');
    expect(wrapper).toHaveTextContent('hello');
    expect(wrapper.querySelector('[data-element-fallback]')).toBeNull();
  });
});
