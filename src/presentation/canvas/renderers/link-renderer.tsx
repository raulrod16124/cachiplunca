import type { ReactElement } from 'react';
import styled from 'styled-components';
import { isLinkElement } from '../../../domain/element';
import type { ElementRendererProps } from './element-renderer';

const Content = styled.div`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 12px;
  overflow: hidden;
  border-radius: var(--rr-radius-100, 4px);
  background-color: var(--rr-color-background-default, #ffffff);
  color: var(--rr-color-text-default, #0f172a);
  font-size: var(--rr-font-size-200, 14px);
  line-height: 1.4;
  cursor: pointer;
`;

const Title = styled.div`
  font-weight: 600;
  word-break: break-word;
`;

const Url = styled.div`
  color: var(--rr-color-link-default, #2563eb);
  overflow-wrap: anywhere;
`;

export function LinkRenderer({ element }: ElementRendererProps): ReactElement | null {
  if (!isLinkElement(element)) {
    return null;
  }

  return (
    <Content data-element-content="true" data-element-type="link" data-link-url={element.url}>
      {element.title === undefined ? null : <Title data-link-title="true">{element.title}</Title>}
      <Url data-link-url-label="true">{element.url}</Url>
    </Content>
  );
}
