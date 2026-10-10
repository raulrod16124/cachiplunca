import type { ReactElement } from 'react';
import styled from 'styled-components';
import type { Element } from '../../../domain/element';
import { resolveElementRenderer } from './resolve-element-renderer';
import type { ElementRendererRegistry } from './element-renderer';

const Wrapper = styled.div`
  position: absolute;
  box-sizing: border-box;
  transform-origin: center center;
  will-change: transform;
`;

export interface ElementViewProps {
  readonly element: Element;
  readonly selected: boolean;
  readonly renderers?: ElementRendererRegistry;
}

export function ElementView({ element, selected, renderers }: ElementViewProps): ReactElement {
  const Renderer = resolveElementRenderer(renderers, element.type);

  return (
    <Wrapper
      data-selectable="true"
      data-selected={selected}
      data-element-type={element.type}
      data-element-id={element.id.value}
      data-testid={`canvas-item-${element.id.value}`}
      style={{
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height,
        transform: `rotate(${element.rotation}deg)`,
      }}
    >
      <Renderer element={element} selected={selected} />
    </Wrapper>
  );
}
