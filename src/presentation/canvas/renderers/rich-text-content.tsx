import type { CSSProperties, ReactElement } from 'react';
import { Fragment } from 'react';
import styled from 'styled-components';
import type {
  RichTextBlock,
  RichTextDocument,
  RichTextHeadingBlock,
  RichTextListItem,
  RichTextMarks,
  RichTextParagraphBlock,
  RichTextSpan,
} from '../../../domain/element';
import { fontFamilyCss } from '../text-format/font-families';

export type RichTextContentMode = 'block' | 'inline';

export interface RichTextContentProps {
  readonly document: RichTextDocument;
  readonly mode?: RichTextContentMode;
}

const Paragraph = styled.p`
  margin: 0;
`;

const Heading1 = styled.h1`
  margin: 0;
  font-size: 1.5em;
  font-weight: 700;
  line-height: 1.3;
`;

const Heading2 = styled.h2`
  margin: 0;
  font-size: 1.25em;
  font-weight: 700;
  line-height: 1.3;
`;

const Heading3 = styled.h3`
  margin: 0;
  font-size: 1.1em;
  font-weight: 700;
  line-height: 1.3;
`;

const UnorderedList = styled.ul`
  margin: 0;
  padding-left: 1.25em;
`;

const OrderedList = styled.ol`
  margin: 0;
  padding-left: 1.25em;
`;

const HEADING_COMPONENTS: Record<RichTextHeadingBlock['level'], typeof Heading1> = {
  1: Heading1,
  2: Heading2,
  3: Heading3,
};

function spanStyle(marks: RichTextMarks | undefined): CSSProperties {
  if (marks === undefined) {
    return {};
  }

  const style: CSSProperties = {};

  if (marks.bold === true) {
    style.fontWeight = 700;
  }

  if (marks.italic === true) {
    style.fontStyle = 'italic';
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

function renderSpan(span: RichTextSpan): ReactElement | string {
  const style = spanStyle(span.marks);
  const styled =
    Object.keys(style).length === 0 ? span.text : <span style={style}>{span.text}</span>;

  if (span.marks?.highlight !== true) {
    return styled;
  }

  const highlightColor = span.marks.highlightColor;
  return (
    <mark style={highlightColor === undefined ? undefined : { backgroundColor: highlightColor }}>
      {styled}
    </mark>
  );
}

function renderSpans(spans: readonly RichTextSpan[]): ReactElement {
  return (
    <>
      {spans.map((span, index) => (
        <Fragment key={index}>{renderSpan(span)}</Fragment>
      ))}
    </>
  );
}

function renderListItem(item: RichTextListItem, index: number): ReactElement {
  return (
    <li key={index}>{item.content.map((block, blockIndex) => renderBlock(block, blockIndex))}</li>
  );
}

function renderBlock(block: RichTextBlock, key: number): ReactElement {
  switch (block.type) {
    case 'paragraph':
      return (
        <Paragraph key={key} style={{ textAlign: block.align }}>
          {renderSpans(block.spans)}
        </Paragraph>
      );
    case 'heading': {
      const Heading = HEADING_COMPONENTS[block.level];
      return (
        <Heading key={key} style={{ textAlign: block.align }}>
          {renderSpans(block.spans)}
        </Heading>
      );
    }
    case 'bulletList':
      return <UnorderedList key={key}>{block.items.map(renderListItem)}</UnorderedList>;
    case 'orderedList':
      return <OrderedList key={key}>{block.items.map(renderListItem)}</OrderedList>;
  }
}

function firstInlineBlock(
  doc: RichTextDocument,
): RichTextParagraphBlock | RichTextHeadingBlock | null {
  for (const block of doc.blocks) {
    if (block.type === 'paragraph' || block.type === 'heading') {
      return block;
    }
  }

  return null;
}

export function RichTextContent({
  document,
  mode = 'block',
}: RichTextContentProps): ReactElement | null {
  if (mode === 'inline') {
    const block = firstInlineBlock(document);

    if (block === null) {
      return null;
    }

    return renderSpans(block.spans);
  }

  return <>{document.blocks.map((block, index) => renderBlock(block, index))}</>;
}
