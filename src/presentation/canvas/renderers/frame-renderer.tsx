import type { ReactElement } from 'react';
import styled from 'styled-components';
import { isFrameElement } from '../../../domain/element';
import type { ElementRendererProps } from './element-renderer';

const Content = styled.div`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px dashed var(--rr-color-border-default, #cbd5e1);
  border-radius: var(--rr-radius-100, 4px);
  background-color: var(--rr-color-background-subtle, #f8fafc);
  color: var(--rr-color-text-default, #0f172a);
  font-size: var(--rr-font-size-200, 14px);
  line-height: 1.4;
  cursor: pointer;
`;

const Header = styled.div`
  padding: 8px 12px;
  border-bottom: 1px solid var(--rr-color-border-default, #cbd5e1);
  background-color: var(--rr-color-background-default, #ffffff);
  font-weight: 600;
  word-break: break-word;
`;

export function FrameRenderer({ element }: ElementRendererProps): ReactElement | null {
  if (!isFrameElement(element)) {
    return null;
  }

  return (
    <Content data-element-content="true" data-element-type="frame">
      <Header data-frame-title="true">{element.title}</Header>
    </Content>
  );
}
