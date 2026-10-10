import { DefaultElementRenderer } from '../../../../../presentation/canvas/renderers';
import { resolveElementRenderer } from '../../../../../presentation/canvas/renderers';
import type { ElementRenderer } from '../../../../../presentation/canvas/renderers';

const customRenderer: ElementRenderer = () => null;

describe('resolveElementRenderer', () => {
  it('falls back to the default renderer when no registry is provided', () => {
    expect(resolveElementRenderer(undefined, 'text')).toBe(DefaultElementRenderer);
  });

  it('falls back to the default renderer when the type is not registered', () => {
    expect(resolveElementRenderer({ note: customRenderer }, 'text')).toBe(DefaultElementRenderer);
  });

  it('returns the registered renderer for the matching type', () => {
    expect(resolveElementRenderer({ note: customRenderer }, 'note')).toBe(customRenderer);
  });
});
