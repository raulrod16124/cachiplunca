import type { ReactElement } from 'react';
import styled from 'styled-components';
import type { ElementRendererProps } from './element-renderer';

const Box = styled.div`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: 1px solid ${({ theme }) => theme.canvas.elementBorder};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.canvas.surface};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  cursor: pointer;
`;

export function DefaultElementRenderer({ element }: ElementRendererProps): ReactElement {
  return <Box data-element-fallback="true" data-element-type={element.type} aria-hidden="true" />;
}
