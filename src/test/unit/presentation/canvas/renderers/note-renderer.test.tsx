import { render, screen } from '@testing-library/react';
import { createNoteElement, createTextElement } from '../../../../../domain/element';
import type { NoteElement } from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import { ElementView, NoteRenderer } from '../../../../../presentation/canvas/renderers';

function createElement(content: string, overrides: Partial<{ color: string }> = {}): NoteElement {
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
