import type { ReactElement } from 'react';
import styled from 'styled-components';
import { isImageElement } from '../../../domain/element';
import type { ElementRendererProps } from './element-renderer';

const Content = styled.div`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.canvas.elementBorderSoft};
  background-color: ${({ theme }) => theme.canvas.surface};
  cursor: pointer;
`;

const Img = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
`;

export function ImageRenderer({ element }: ElementRendererProps): ReactElement | null {
  if (!isImageElement(element)) {
    return null;
  }

  return (
    <Content data-element-content="true" data-element-type="image" data-image-src={element.src}>
      <Img
        src={element.src}
        alt={element.alt ?? ''}
        draggable={false}
        data-testid={`image-content-${element.id.value}`}
      />
    </Content>
  );
}
