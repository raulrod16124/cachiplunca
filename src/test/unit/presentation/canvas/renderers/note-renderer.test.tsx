import { render, screen } from '@testing-library/react';
import {
  createNoteElement,
  createTextElement,
  DEFAULT_TEXT_ALIGN,
} from '../../../../../domain/element';
import type { NoteElement, RichTextDocument } from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import { ElementView, NoteRenderer } from '../../../../../presentation/canvas/renderers';

function createElement(
  content: string | RichTextDocument,
  overrides: Partial<{ color: string }> = {},
): NoteElement {
  return createNoteElement({
    id: ElementId.create('elem-1'),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(30, 40),
    size: Size.create(120, 80),
    content,
    color: overrides.color,
  });
}

describe('NoteRenderer', () => {
  it('renders the element content', () => {
    render(<NoteRenderer element={createElement('hello')} selected={false} />);

    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('exposes the content node with a data attribute', () => {
    render(<NoteRenderer element={createElement('hello')} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content).not.toBeNull();
    expect(content).toHaveAttribute('data-element-type', 'note');
  });

  it('preserves whitespace and line breaks', () => {
    render(<NoteRenderer element={createElement('line one\nline two')} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content?.textContent).toBe('line one\nline two');
  });

  it('renders empty content without crashing', () => {
    render(<NoteRenderer element={createElement('')} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content).not.toBeNull();
    expect(content?.textContent).toBe('');
  });

  it('applies the element color when present', () => {
    render(
      <NoteRenderer element={createElement('hello', { color: '#fef08a' })} selected={false} />,
    );

    const content = document.querySelector('[data-element-content]');
    expect(content).toHaveStyle({ backgroundColor: '#fef08a' });
  });

  it('does not set an inline background when color is absent', () => {
    render(<NoteRenderer element={createElement('hello')} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content).not.toHaveStyle({ backgroundColor: '#fef08a' });
  });

  it('delimits the container with a soft border', () => {
    render(<NoteRenderer element={createElement('hello')} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content).toHaveStyle({ borderTopWidth: '1px', borderTopStyle: 'solid' });
  });

  it('returns null for a non-note element', () => {
    const text = createTextElement({
      id: ElementId.create('elem-2'),
      workspaceId: WorkspaceId.create('ws-1'),
      createdBy: UserId.create('user-1'),
      position: Position.create(0, 0),
      size: Size.create(10, 10),
      content: 'text',
    });

    const { container } = render(<NoteRenderer element={text} selected={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders multi-block documents as separate paragraphs', () => {
    const doc: RichTextDocument = {
      blocks: [
        { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'first' }] },
        { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'second' }] },
      ],
    };

    render(<NoteRenderer element={createElement(doc)} selected={false} />);

    expect(screen.getByText('first').tagName).toBe('P');
    expect(screen.getByText('second').tagName).toBe('P');
  });

  it('renders headings and lists from a rich text document', () => {
    const doc: RichTextDocument = {
      blocks: [
        { type: 'heading', level: 2, align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'Ideas' }] },
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'idea a' }] },
              ],
            },
          ],
        },
      ],
    };

    const { container } = render(<NoteRenderer element={createElement(doc)} selected={false} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Ideas' })).toBeInTheDocument();
    expect(container.querySelector('ul li')).toHaveTextContent('idea a');
  });

  it('renders inline marks from a rich text document', () => {
    const doc: RichTextDocument = {
      blocks: [
        {
          type: 'paragraph',
          align: DEFAULT_TEXT_ALIGN,
          spans: [{ text: 'strong', marks: { bold: true } }],
        },
      ],
    };

    render(<NoteRenderer element={createElement(doc)} selected={false} />);

    expect(screen.getByText('strong')).toHaveStyle({ fontWeight: 700 });
  });

  it('delegates to the renderer through ElementView', () => {
    render(
      <ElementView
        element={createElement('hello')}
        selected={false}
        renderers={{ note: NoteRenderer }}
      />,
    );

    const wrapper = screen.getByTestId('canvas-item-elem-1');
    expect(wrapper).toHaveTextContent('hello');
    expect(wrapper.querySelector('[data-element-fallback]')).toBeNull();
  });
});
