import type { ReactElement } from 'react';
import styled from 'styled-components';
import { isConnectorElement } from '../../../domain/element';
import type { ElementRendererProps } from './element-renderer';

const STROKE_WIDTH = 2;
const ARROW_SIZE = 8;

const Content = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  cursor: pointer;
  color: ${({ theme }) => theme.canvas.elementBorderStrong};
`;

function toMarkerId(elementId: string): string {
  return `connector-arrow-${elementId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

export function ConnectorRenderer({ element }: ElementRendererProps): ReactElement | null {
  if (!isConnectorElement(element)) {
    return null;
  }

  const markerId = toMarkerId(element.id.value);

  return (
    <Content
      data-element-content="true"
      data-element-type="connector"
      data-connector-source={element.sourceElementId.value}
      data-connector-target={element.targetElementId.value}
      width="100%"
      height="100%"
      aria-hidden="true"
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
      <line
        data-connector-line="true"
        x1="2%"
        y1="2%"
        x2="98%"
        y2="98%"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        markerEnd={`url(#${markerId})`}
      />
    </Content>
  );
}
