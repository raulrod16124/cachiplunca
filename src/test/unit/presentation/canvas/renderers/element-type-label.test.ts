import { ELEMENT_TYPES } from '../../../../../domain/element';
import { elementTypeLabelKey } from '../../../../../presentation/canvas/renderers';

describe('elementTypeLabelKey', () => {
  it.each(ELEMENT_TYPES)('maps %s to a dedicated translation key', (type) => {
    expect(elementTypeLabelKey(type)).toBe(`canvas.elementType.${type}`);
  });
});
