import type { ReactElement } from 'react';
import styled from 'styled-components';
import type { ElementRendererProps } from './element-renderer';

const Box = styled.div`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: 1px solid var(--rr-color-border-default, #cbd5e1);
  border-radius: 4px;
  background: var(--rr-color-background-default, #ffffff);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  cursor: pointer;
`;

export function DefaultElementRenderer({ element }: ElementRendererProps): ReactElement {
  return <Box data-element-fallback="true" data-element-type={element.type} />;
}
