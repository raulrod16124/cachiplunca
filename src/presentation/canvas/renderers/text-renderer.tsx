import type { ReactElement } from 'react';
import styled from 'styled-components';
import { isTextElement } from '../../../domain/element';
import type { ElementRendererProps } from './element-renderer';
import { RichTextContent } from './rich-text-content';

const Content = styled.div`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  padding: 8px;
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
  word-break: break-word;
  cursor: pointer;
`;

export function TextRenderer({ element }: ElementRendererProps): ReactElement | null {
  if (!isTextElement(element)) {
    return null;
  }

  return (
    <Content data-element-content="true" data-element-type="text">
      <RichTextContent document={element.content} />
    </Content>
  );
}
