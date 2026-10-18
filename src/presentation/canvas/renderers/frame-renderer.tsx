import type { ReactElement } from 'react';
import styled from 'styled-components';
import { isFrameElement, richTextToPlain } from '../../../domain/element';
import type { ElementRendererProps } from './element-renderer';

const Content = styled.div`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px dashed ${({ theme }) => theme.canvas.elementBorder};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.canvas.surfaceMuted};
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.4;
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
      <Header data-frame-title="true">{richTextToPlain(element.title)}</Header>
    </Content>
  );
}
