import type { ReactElement } from 'react';
import styled from 'styled-components';
import { isFrameElement } from '../../../domain/element';
import type { ElementRendererProps } from './element-renderer';
import { RichTextContent } from './rich-text-content';

const Content = styled.div`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px dashed ${({ theme }) => theme.canvas.elementBorder};
  border-radius: ${({ theme }) => theme.radius.md};
  background-color: ${({ theme }) => theme.canvas.surfaceMuted};
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.family.sans};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: ${({ theme }) => theme.font.leading.normal};
  cursor: pointer;
`;

const Header = styled.div`
  padding: 8px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.canvas.elementBorder};
  background-color: ${({ theme }) => theme.canvas.surface};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  word-break: break-word;
`;

export function FrameRenderer({ element }: ElementRendererProps): ReactElement | null {
  if (!isFrameElement(element)) {
    return null;
  }

  return (
    <Content data-element-content="true" data-element-type="frame">
      <Header data-frame-title="true">
        <RichTextContent document={element.title} mode="inline" />
      </Header>
    </Content>
  );
}
