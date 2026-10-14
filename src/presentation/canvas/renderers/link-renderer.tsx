import type { ReactElement } from 'react';
import styled from 'styled-components';
import { isLinkElement } from '../../../domain/element';
import type { ElementRendererProps } from './element-renderer';

const Content = styled.div`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 12px;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.canvas.surface};
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.4;
  cursor: pointer;
`;

const Title = styled.div`
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  word-break: break-word;
`;

const Url = styled.div`
  color: ${({ theme }) => theme.color.link.text};
  overflow-wrap: anywhere;
`;

export function LinkRenderer({ element }: ElementRendererProps): ReactElement | null {
  if (!isLinkElement(element)) {
    return null;
  }

  return (
    <Content
      data-element-content="true"
      data-element-type="link"
      data-link-url={element.url}
      aria-hidden="true"
    >
      {element.title === undefined ? null : <Title data-link-title="true">{element.title}</Title>}
      <Url data-link-url-label="true">{element.url}</Url>
    </Content>
  );
}
