import type { CSSProperties, ReactElement } from 'react';
import { memo, useMemo } from 'react';
import styled from 'styled-components';
import type { UpdateElementInput } from '../../../application/commands';
import type { Element } from '../../../domain/element';
import { Bounds, Position, type Size } from '../../../domain/shared';
import { describeElement } from '../accessibility';
import type { ConnectorRenderGeometry, ElementRendererRegistry } from './element-renderer';
import { resolveElementRenderer } from './resolve-element-renderer';

const Wrapper = styled.div`
  position: absolute;
  box-sizing: border-box;
  transform-origin: center center;
  will-change: transform;
  contain: layout paint;
`;

export interface ElementViewProps {
  readonly element: Element;
  readonly selected: boolean;
  readonly renderers?: ElementRendererRegistry;
  readonly ariaLabel?: string;
  readonly zIndex?: number;
  readonly connectorStart?: Position;
  readonly connectorEnd?: Position;
  readonly assigneeLabel?: string;
  readonly onUpdateElement?: (input: UpdateElementInput) => void;
  readonly onResizeElement?: (element: Element, size: Size) => void;
}

function ElementViewComponent({
  element,
  selected,
  renderers,
  ariaLabel,
  zIndex,
  connectorStart,
  connectorEnd,
  assigneeLabel,
  onUpdateElement,
  onResizeElement,
}: ElementViewProps): ReactElement {
  const Renderer = resolveElementRenderer(renderers, element.type);

  const connectorGeometry = useMemo<ConnectorRenderGeometry | undefined>(() => {
    if (connectorStart === undefined || connectorEnd === undefined) {
      return undefined;
    }

    const left = Math.min(connectorStart.x, connectorEnd.x);
    const top = Math.min(connectorStart.y, connectorEnd.y);
    const origin = Position.create(left, top);

    return { start: connectorStart, end: connectorEnd, origin };
  }, [connectorStart, connectorEnd]);

  const style = useMemo<CSSProperties>(() => {
    if (connectorGeometry !== undefined) {
      const bounds = Bounds.fromXYWH(
        connectorGeometry.origin.x,
        connectorGeometry.origin.y,
        Math.abs(connectorGeometry.end.x - connectorGeometry.start.x),
        Math.abs(connectorGeometry.end.y - connectorGeometry.start.y),
      );

      return {
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        transform: `rotate(${element.rotation}deg)`,
        zIndex,
        pointerEvents: 'none',
        contain: 'none',
      };
    }

    return {
      left: element.position.x,
      top: element.position.y,
      width: element.size.width,
      height: element.size.height,
      transform: `rotate(${element.rotation}deg)`,
      zIndex,
    };
  }, [
    connectorGeometry,
    element.position.x,
    element.position.y,
    element.size.width,
    element.size.height,
    element.rotation,
    zIndex,
  ]);

  return (
    <Wrapper
      id={`element-${element.id.value}`}
      role="group"
      aria-label={ariaLabel ?? describeElement(element)}
      aria-current={selected ? 'true' : undefined}
      data-selectable="true"
      data-selected={selected}
      data-element-type={element.type}
      data-element-id={element.id.value}
      data-testid={`canvas-item-${element.id.value}`}
      style={style}
    >
      <Renderer
        element={element}
        selected={selected}
        connectorGeometry={connectorGeometry}
        assigneeLabel={assigneeLabel}
        onUpdateElement={onUpdateElement}
        onResizeElement={onResizeElement}
      />
    </Wrapper>
  );
}

export const ElementView = memo(ElementViewComponent);
