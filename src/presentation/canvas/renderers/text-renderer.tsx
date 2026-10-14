import type { ReactElement } from 'react';
import styled from 'styled-components';
import { isTextElement } from '../../../domain/element';
import type { ElementRendererProps } from './element-renderer';

const Content = styled.div`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  padding: 8px;
  overflow: hidden;
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  cursor: pointer;
`;

export function TextRenderer({ element }: ElementRendererProps): ReactElement | null {
  if (!isTextElement(element)) {
    return null;
  }

  return (
    <Content data-element-content="true" data-element-type="text" aria-hidden="true">
      {element.content}
    </Content>
  );
}
