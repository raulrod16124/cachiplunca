import type { ElementType } from '../../../../../domain/element';
import {
  DefaultElementRenderer,
  NoteRenderer,
  TextRenderer,
  defaultRendererRegistry,
  resolveElementRenderer,
} from '../../../../../presentation/canvas/renderers';
import type { ElementRenderer } from '../../../../../presentation/canvas/renderers';

const customRenderer: ElementRenderer = () => null;

describe('resolveElementRenderer', () => {
  it('returns the built-in renderer when no registry is provided', () => {
    expect(resolveElementRenderer(undefined, 'text')).toBe(TextRenderer);
    expect(resolveElementRenderer(undefined, 'note')).toBe(NoteRenderer);
  });

  it('returns the built-in renderer when the type is not overridden', () => {
    expect(resolveElementRenderer({ note: customRenderer }, 'text')).toBe(TextRenderer);
  });

  it('returns the registered renderer for the matching type', () => {
    expect(resolveElementRenderer({ note: customRenderer }, 'note')).toBe(customRenderer);
  });

  it('falls back to the default renderer for an unregistered element type', () => {
    const unknownType = 'unknown' as ElementType;

    expect(resolveElementRenderer(undefined, unknownType)).toBe(DefaultElementRenderer);
  });
});

describe('defaultRendererRegistry', () => {
  it('registers a renderer for every element type', () => {
    const types: readonly ElementType[] = [
      'text',
      'note',
      'task',
      'frame',
      'connector',
      'link',
      'image',
    ];

    for (const type of types) {
      expect(defaultRendererRegistry[type]).toBeDefined();
    }
  });
});
