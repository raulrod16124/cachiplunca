import { fireEvent, render, screen } from '@testing-library/react';
import { createImageElement, createTextElement } from '../../../../../domain/element';
import { ElementId, Position, Size, UserId, WorkspaceId } from '../../../../../domain/shared';
import { ElementView, ImageRenderer } from '../../../../../presentation/canvas/renderers';

function createImage(overrides: Partial<Parameters<typeof createImageElement>[0]> = {}) {
  return createImageElement({
    id: ElementId.create('image-1'),
    workspaceId: WorkspaceId.create('ws-1'),
    createdBy: UserId.create('user-1'),
    position: Position.create(10, 20),
    size: Size.create(320, 200),
    src: 'https://example.com/image.png',
    alt: 'Architecture diagram',
    ...overrides,
  });
}

describe('ImageRenderer', () => {
  it('renders the image with its alt text', () => {
    render(<ImageRenderer element={createImage()} selected={false} />);

    const image = screen.getByRole('img', { name: 'Architecture diagram' });
    expect(image).toHaveAttribute('src', 'https://example.com/image.png');
    expect(image).toHaveAttribute('draggable', 'false');
  });

  it('exposes the content node with data attributes', () => {
    render(<ImageRenderer element={createImage()} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content).toHaveAttribute('data-element-type', 'image');
    expect(content).toHaveAttribute('data-image-src', 'https://example.com/image.png');
  });

  it('uses an empty alt for decorative images', () => {
    render(<ImageRenderer element={createImage({ alt: undefined })} selected={false} />);

    const image = document.querySelector('img');
    expect(image).toHaveAttribute('alt', '');
  });

  it('starts in the loading state with a visual placeholder', () => {
    render(<ImageRenderer element={createImage()} selected={false} />);

    const content = document.querySelector('[data-element-content]');
    expect(content).toHaveAttribute('data-image-state', 'loading');
    expect(content).toHaveAttribute('aria-busy', 'true');
    expect(document.querySelector('[data-image-overlay]')).toBeInTheDocument();
  });

  it('switches to the loaded state after the image loads', () => {
    render(<ImageRenderer element={createImage()} selected={false} />);

    fireEvent.load(screen.getByRole('img', { name: 'Architecture diagram' }));

    const content = document.querySelector('[data-element-content]');
    expect(content).toHaveAttribute('data-image-state', 'loaded');
    expect(content).not.toHaveAttribute('aria-busy');
    expect(document.querySelector('[data-image-overlay]')).not.toBeInTheDocument();
  });

  it('shows a non-color error state when the image fails', () => {
    render(<ImageRenderer element={createImage()} selected={false} />);

    fireEvent.error(screen.getByRole('img', { name: 'Architecture diagram' }));

    const content = document.querySelector('[data-element-content]');
    expect(content).toHaveAttribute('data-image-state', 'error');
    expect(document.querySelector('[data-image-overlay]')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Architecture diagram' })).toBeInTheDocument();
  });

  it('returns to the loading state when the source changes', () => {
    const { rerender } = render(<ImageRenderer element={createImage()} selected={false} />);

    fireEvent.load(screen.getByRole('img', { name: 'Architecture diagram' }));
    expect(document.querySelector('[data-element-content]')).toHaveAttribute(
      'data-image-state',
      'loaded',
    );

    rerender(
      <ImageRenderer
        element={createImage({ src: 'https://example.com/another-image.png' })}
        selected={false}
      />,
    );

    expect(document.querySelector('[data-element-content]')).toHaveAttribute(
      'data-image-state',
      'loading',
    );
  });

  it('returns null for a non-image element', () => {
    const text = createTextElement({
      id: ElementId.create('text-1'),
      workspaceId: WorkspaceId.create('ws-1'),
      createdBy: UserId.create('user-1'),
      position: Position.create(0, 0),
      size: Size.create(10, 10),
      content: 'text',
    });

    const { container } = render(<ImageRenderer element={text} selected={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders through ElementView with an accessible label', () => {
    render(<ElementView element={createImage()} selected={false} />);

    expect(screen.getByRole('group', { name: 'Image: Architecture diagram' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Architecture diagram' })).toBeInTheDocument();
  });
});
