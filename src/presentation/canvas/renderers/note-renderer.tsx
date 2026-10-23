import type { ReactElement } from 'react';
import styled from 'styled-components';
import { isNoteElement } from '../../../domain/element';
import type { ElementRendererProps } from './element-renderer';
import { RichTextContent } from './rich-text-content';

const Content = styled.div`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  padding: ${({ theme }) => theme.space[3]};
  overflow: hidden;
  border-radius: var(--stitch-radius-icon, ${({ theme }) => theme.radius.md});
  border-width: 1px;
  border-style: solid;
  border-color: var(--stitch-note-border, var(--cach-note-border));
  border-top-width: 2px;
  background-color: var(--cach-note-default);
  box-shadow: var(--stitch-note-shadow, var(--cach-note-shadow));
  color: var(--stitch-text, ${({ theme }) => theme.color.text.primary});
  font-family: var(--stitch-font-body, ${({ theme }) => theme.font.family.sans});
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: ${({ theme }) => theme.font.leading.relaxed};
  white-space: pre-wrap;
  word-break: break-word;
  cursor: pointer;
  transition: box-shadow ${({ theme }) => theme.motion.duration.base}
    ${({ theme }) => theme.motion.easing.standard};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  &:hover {
    box-shadow: var(--stitch-note-shadow-hover, var(--cach-note-shadow));
  }
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
      <RichTextContent document={element.content} />
    </Content>
  );
}
