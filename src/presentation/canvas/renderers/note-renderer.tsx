import type { ReactElement } from 'react';
import styled from 'styled-components';
import { isNoteElement } from '../../../domain/element';
import type { ElementRendererProps } from './element-renderer';

const Content = styled.div`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  padding: 12px;
  overflow: hidden;
  border-radius: var(--rr-radius-100, 4px);
  background-color: var(--rr-color-background-default, #ffffff);
  color: var(--rr-color-text-default, #0f172a);
  font-size: var(--rr-font-size-200, 14px);
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
      {element.content}
    </Content>
  );
}
