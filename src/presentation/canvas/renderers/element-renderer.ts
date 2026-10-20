import type { ReactElement } from 'react';
import type { UpdateElementInput } from '../../../application/commands';
import type { Element, ElementType } from '../../../domain/element';
import type { Position, Size } from '../../../domain/shared';

export interface ConnectorRenderGeometry {
  readonly start: Position;
  readonly end: Position;
  readonly origin: Position;
}

export interface ElementRendererProps {
  readonly element: Element;
  readonly selected: boolean;
  readonly connectorGeometry?: ConnectorRenderGeometry;
  readonly assigneeLabel?: string;
  readonly onUpdateElement?: (input: UpdateElementInput) => void;
  readonly onResizeElement?: (element: Element, size: Size) => void;
}

export type ElementRenderer = (props: ElementRendererProps) => ReactElement | null;

export type ElementRendererRegistry = Partial<Record<ElementType, ElementRenderer>>;
