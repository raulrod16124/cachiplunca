import { render, screen } from '@testing-library/react';
import {
  createFrameElement,
  createTextElement,
  DEFAULT_TEXT_ALIGN,
} from '../../../../../domain/element';
import type { FrameElement, RichTextDocument } from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import { ElementView, FrameRenderer } from '../../../../../presentation/canvas/renderers';

function createElement(
  title: string | RichTextDocument,
  overrides: Partial<{ parentFrameId: string }> = {},
): FrameElement {
  return createFrameElement({
    id: ElementId.create('elem-1'),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(30, 40),
    size: Size.create(320, 200),
    title,
    parentFrameId:
      overrides.parentFrameId === undefined ? undefined : ElementId.create(overrides.parentFrameId),
  });
}

describe('FrameRenderer', () => {
  it('renders the element title', () => {
    render(<FrameRenderer element={createElement('Planning')} selected={false} />);

    expect(screen.getByText('Planning')).toBeInTheDocument();
  });

  it('exposes the content node with a data attribute', () => {
    render(<FrameRenderer element={createElement('Planning')} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content).not.toBeNull();
    expect(content).toHaveAttribute('data-element-type', 'frame');
  });

  it('marks the title node explicitly', () => {
    render(<FrameRenderer element={createElement('Planning')} selected={false} />);

    const title = document.querySelector('[data-frame-title]');
    expect(title).not.toBeNull();
    expect(title).toHaveTextContent('Planning');
  });

  it('renders a frame with a parent without crashing', () => {
    render(
      <FrameRenderer
        element={createElement('Planning', { parentFrameId: 'elem-0' })}
        selected={false}
      />,
    );

    expect(screen.getByText('Planning')).toBeInTheDocument();
  });

  it('returns null for a non-frame element', () => {
    const text = createTextElement({
      id: ElementId.create('elem-2'),
      workspaceId: WorkspaceId.create('ws-1'),
      createdBy: UserId.create('user-1'),
      position: Position.create(0, 0),
      size: Size.create(10, 10),
      content: 'text',
    });

    const { container } = render(<FrameRenderer element={text} selected={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the title with inline marks', () => {
    const doc: RichTextDocument = {
      blocks: [
        {
          type: 'paragraph',
          align: DEFAULT_TEXT_ALIGN,
          spans: [{ text: 'Planning', marks: { italic: true } }],
        },
      ],
    };

    render(<FrameRenderer element={createElement(doc)} selected={false} />);

    const title = document.querySelector('[data-frame-title]');
    expect(title).not.toBeNull();
    expect(screen.getByText('Planning')).toHaveStyle({ fontStyle: 'italic' });
  });

  it('renders only the first text block and never lists in the title', () => {
    const doc: RichTextDocument = {
      blocks: [
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'listed' }] },
              ],
            },
          ],
        },
        { type: 'heading', level: 1, align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'Board' }] },
      ],
    };
    const element: FrameElement = { ...createElement('placeholder'), title: doc };

    const { container } = render(<FrameRenderer element={element} selected={false} />);

    expect(screen.getByText('Board')).toBeInTheDocument();
    expect(screen.queryByText('listed')).toBeNull();
    expect(container.querySelector('ul')).toBeNull();
    expect(container.querySelector('h1')).toBeNull();
  });

  it('delegates to the renderer through ElementView', () => {
    render(
      <ElementView
        element={createElement('Planning')}
        selected={false}
        renderers={{ frame: FrameRenderer }}
      />,
    );

    const wrapper = screen.getByTestId('canvas-item-elem-1');
    expect(wrapper).toHaveTextContent('Planning');
    expect(wrapper.querySelector('[data-element-fallback]')).toBeNull();
  });
});
