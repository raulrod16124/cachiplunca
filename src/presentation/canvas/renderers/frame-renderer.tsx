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
  border: 2px dashed var(--stitch-frame-border, ${({ theme }) => theme.canvas.elementBorder});
  border-radius: var(--stitch-radius-frame, ${({ theme }) => theme.radius.lg});
  background-color: var(--stitch-frame-bg, ${({ theme }) => theme.canvas.surfaceMuted});
  color: var(--stitch-text, ${({ theme }) => theme.color.text.primary});
  font-family: var(--stitch-font-body, ${({ theme }) => theme.font.family.sans});
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: ${({ theme }) => theme.font.leading.normal};
  cursor: pointer;
`;

const Header = styled.div`
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  border-bottom: 1px dashed var(--stitch-frame-border, ${({ theme }) => theme.canvas.elementBorder});
  background-color: color-mix(
    in srgb,
    var(--stitch-surface, ${({ theme }) => theme.canvas.surface}) 60%,
    transparent
  );
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: ${({ theme }) => theme.font.tracking.tight};
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
