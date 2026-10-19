import type { ReactElement } from 'react';
import type { UpdateElementInput } from '../../../application/commands';
import type { Element, ElementType } from '../../../domain/element';

export interface ElementRendererProps {
  readonly element: Element;
  readonly selected: boolean;
  readonly onUpdateElement?: (input: UpdateElementInput) => void;
}

export type ElementRenderer = (props: ElementRendererProps) => ReactElement | null;

export type ElementRendererRegistry = Partial<Record<ElementType, ElementRenderer>>;
