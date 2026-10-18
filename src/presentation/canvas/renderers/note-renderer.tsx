import type { ReactElement } from 'react';
import styled from 'styled-components';
import { isNoteElement, richTextToPlain } from '../../../domain/element';
import type { ElementRendererProps } from './element-renderer';

const Content = styled.div`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  padding: 12px;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.sm};
  border-width: 1px;
  border-style: solid;
  border-color: ${({ theme }) => theme.canvas.elementBorderSoft};
  background-color: ${({ theme }) => theme.canvas.surface};
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  cursor: pointer;
`;

export function NoteRenderer({ element }: ElementRendererProps): ReactElement | null {
  if (!isNoteElement(element)) {
    return null;
  }

  return (
    <Content
      data-element-content="true"
      data-element-type="note"
      style={element.color === undefined ? undefined : { backgroundColor: element.color }}
    >
      {richTextToPlain(element.content)}
    </Content>
  );
}
