import type { ElementType } from '../../../domain/element';
import { DefaultElementRenderer } from './default-element-renderer';
import type { ElementRenderer, ElementRendererRegistry } from './element-renderer';

export function resolveElementRenderer(
  registry: ElementRendererRegistry | undefined,
  type: ElementType,
): ElementRenderer {
  return registry?.[type] ?? DefaultElementRenderer;
}
