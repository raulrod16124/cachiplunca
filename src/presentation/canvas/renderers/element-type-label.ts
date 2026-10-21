import type { ElementType } from '../../../domain/element';
import type { TranslationKey } from '../../i18n/messages';

const ELEMENT_TYPE_LABEL_KEYS: Record<ElementType, TranslationKey> = {
  text: 'canvas.elementType.text',
  note: 'canvas.elementType.note',
  task: 'canvas.elementType.task',
  frame: 'canvas.elementType.frame',
  connector: 'canvas.elementType.connector',
  link: 'canvas.elementType.link',
  image: 'canvas.elementType.image',
};

export function elementTypeLabelKey(type: ElementType): TranslationKey {
  return ELEMENT_TYPE_LABEL_KEYS[type];
}
