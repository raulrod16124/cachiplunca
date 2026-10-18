import type { CSSProperties, ReactElement } from 'react';
import { Fragment } from 'react';
import styled from 'styled-components';
import { isTextElement } from '../../../domain/element';
import type { RichTextMarks } from '../../../domain/element';
import { fontFamilyCss } from '../text-format/font-families';
import type { ElementRendererProps } from './element-renderer';

const Content = styled.div`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  padding: 8px;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.sm};
  border-width: 1px;
  border-style: solid;
  border-color: ${({ theme }) => theme.canvas.elementBorderSoft};
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.4;
  word-break: break-word;
  cursor: pointer;
`;

const Paragraph = styled.p`
  margin: 0;
`;

function spanStyle(marks: RichTextMarks | undefined): CSSProperties {
  if (marks === undefined) {
    return {};
  }

  const style: CSSProperties = {};

  if (marks.bold === true) {
    style.fontWeight = 700;
  }

  const decorations: string[] = [];
  if (marks.underline === true) decorations.push('underline');
  if (marks.strikethrough === true) decorations.push('line-through');
  if (decorations.length > 0) style.textDecoration = decorations.join(' ');

  if (marks.color !== undefined) style.color = marks.color;
  if (marks.fontFamily !== undefined) style.fontFamily = fontFamilyCss(marks.fontFamily);
  if (marks.fontSize !== undefined) style.fontSize = `${marks.fontSize}px`;

  return style;
}

export function TextRenderer({ element }: ElementRendererProps): ReactElement | null {
  if (!isTextElement(element)) {
    return null;
  }

  return (
    <Content data-element-content="true" data-element-type="text">
      {element.content.blocks.map((block, blockIndex) => {
        if (block.type !== 'paragraph') {
          return null;
        }

        return (
          <Paragraph key={blockIndex} style={{ textAlign: block.align }}>
            {block.spans.map((span, spanIndex) => {
              const style = spanStyle(span.marks);

              return (
                <Fragment key={spanIndex}>
                  {Object.keys(style).length === 0 ? (
                    span.text
                  ) : (
                    <span style={style}>{span.text}</span>
                  )}
                </Fragment>
              );
            })}
          </Paragraph>
        );
      })}
    </Content>
  );
}
