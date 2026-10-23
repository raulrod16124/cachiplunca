import type { ReactElement } from 'react';
import styled from 'styled-components';
import { isConnectorElement } from '../../../domain/element';
import { Position } from '../../../domain/shared';
import type { ElementRendererProps } from './element-renderer';

const STROKE_WIDTH = 2.5;
const SELECTED_STROKE_WIDTH = 3.5;
const HIT_STROKE_WIDTH = 14;
const ARROW_SIZE = 8;

const Content = styled.svg<{ readonly $bound: boolean; readonly $selected: boolean }>`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
  color: ${({ theme, $bound, $selected }) =>
    $selected || !$bound
      ? `var(--stitch-primary, ${theme.color.border.primary})`
      : `var(--stitch-secondary, ${theme.canvas.elementBorderStrong})`};
`;

const HitLine = styled.line`
  pointer-events: stroke;
  cursor: pointer;
  stroke: transparent;
`;

function toMarkerId(elementId: string): string {
  return `connector-arrow-${elementId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function localPoint(point: Position, origin: Position): Position {
  return point.subtract(origin);
}

export function ConnectorRenderer({
  element,
  selected,
  connectorGeometry,
}: ElementRendererProps): ReactElement | null {
  if (!isConnectorElement(element)) {
    return null;
  }

  const markerId = toMarkerId(element.id.value);
  const origin = connectorGeometry?.origin ?? element.position;
  const start = localPoint(connectorGeometry?.start ?? element.position, origin);
  const end = localPoint(
    connectorGeometry?.end ??
      Position.create(
        element.position.x + element.size.width,
        element.position.y + element.size.height,
      ),
    origin,
  );
  const bound = element.sourceElementId !== undefined || element.targetElementId !== undefined;

  return (
    <Content
      data-element-content="true"
      data-element-type="connector"
      data-connector-source={
        element.sourceElementId?.value ?? element.sourcePoint?.toString() ?? ''
      }
      data-connector-target={
        element.targetElementId?.value ?? element.targetPoint?.toString() ?? ''
      }
      width="100%"
      height="100%"
      aria-hidden="true"
      $bound={bound}
      $selected={selected}
    >
      <defs>
        <marker
          id={markerId}
          data-connector-arrow="true"
          markerWidth={ARROW_SIZE}
          markerHeight={ARROW_SIZE}
          refX={ARROW_SIZE - 1}
          refY={ARROW_SIZE / 2}
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d={`M0,0 L${ARROW_SIZE},${ARROW_SIZE / 2} L0,${ARROW_SIZE} Z`}
            fill="currentColor"
          />
        </marker>
      </defs>
      <HitLine
        data-connector-hit-line="true"
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        strokeWidth={HIT_STROKE_WIDTH}
      />
      <line
        data-connector-line="true"
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="currentColor"
        strokeWidth={selected ? SELECTED_STROKE_WIDTH : STROKE_WIDTH}
        strokeDasharray={bound ? undefined : '6 4'}
        strokeLinecap="round"
        markerEnd={`url(#${markerId})`}
      />
    </Content>
  );
}
