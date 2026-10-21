import type { ReactElement } from 'react';
import styled from 'styled-components';
import { isLinkElement } from '../../../domain/element';
import type { ElementRendererProps } from './element-renderer';
import { RichTextContent } from './rich-text-content';

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
  border-radius: ${({ theme }) => theme.radius.md};
  border-width: 1px;
  border-style: solid;
  border-color: ${({ theme }) => theme.canvas.elementBorderSoft};
  background-color: ${({ theme }) => theme.canvas.surface};
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.family.sans};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: ${({ theme }) => theme.font.leading.normal};
  cursor: pointer;
`;

const Title = styled.div`
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  word-break: break-word;
`;

const Url = styled.div`
  color: ${({ theme }) => theme.color.link.text};
  overflow-wrap: anywhere;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
`;

export function LinkRenderer({ element }: ElementRendererProps): ReactElement | null {
  if (!isLinkElement(element)) {
    return null;
  }

  return (
    <Content data-element-content="true" data-element-type="link" data-link-url={element.url}>
      {element.title === undefined ? null : (
        <Title data-link-title="true">
          <RichTextContent document={element.title} mode="inline" />
        </Title>
      )}
      <Url data-link-url-label="true">{element.url}</Url>
    </Content>
  );
}
