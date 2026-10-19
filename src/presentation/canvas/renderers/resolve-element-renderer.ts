import type { ElementType } from '../../../domain/element';
import { DefaultElementRenderer } from './default-element-renderer';
import { defaultRendererRegistry } from './default-renderer-registry';
import type { ElementRenderer, ElementRendererRegistry } from './element-renderer';

export function resolveElementRenderer(
  registry: ElementRendererRegistry | undefined,
  type: ElementType,
): ElementRenderer {
  const renderer = registry?.[type] ?? defaultRendererRegistry[type];

  return renderer ?? DefaultElementRenderer;
}
