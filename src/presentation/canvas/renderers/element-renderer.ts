import type { ReactElement } from 'react';
import type { Element, ElementType } from '../../../domain/element';

export interface ElementRendererProps {
  readonly element: Element;
  readonly selected: boolean;
}

export type ElementRenderer = (props: ElementRendererProps) => ReactElement | null;

export type ElementRendererRegistry = Partial<Record<ElementType, ElementRenderer>>;
