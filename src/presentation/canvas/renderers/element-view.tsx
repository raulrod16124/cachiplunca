import type { CSSProperties, ReactElement } from 'react';
import { memo, useMemo } from 'react';
import styled from 'styled-components';
import type { UpdateElementInput } from '../../../application/commands';
import type { Element } from '../../../domain/element';
import { describeElement } from '../accessibility';
import type { ElementRendererRegistry } from './element-renderer';
import { resolveElementRenderer } from './resolve-element-renderer';

const Wrapper = styled.div`
  position: absolute;
  box-sizing: border-box;
  transform-origin: center center;
  will-change: transform;
  contain: layout paint;
`;

export interface ElementViewProps {
  readonly element: Element;
  readonly selected: boolean;
  readonly renderers?: ElementRendererRegistry;
  readonly ariaLabel?: string;
  readonly zIndex?: number;
  readonly onUpdateElement?: (input: UpdateElementInput) => void;
}

function ElementViewComponent({
  element,
  selected,
  renderers,
  ariaLabel,
  zIndex,
  onUpdateElement,
}: ElementViewProps): ReactElement {
  const Renderer = resolveElementRenderer(renderers, element.type);

  const style = useMemo<CSSProperties>(
    () => ({
      left: element.position.x,
      top: element.position.y,
      width: element.size.width,
      height: element.size.height,
      transform: `rotate(${element.rotation}deg)`,
      zIndex,
    }),
    [
      element.position.x,
      element.position.y,
      element.size.width,
      element.size.height,
      element.rotation,
      zIndex,
    ],
  );

  return (
    <Wrapper
      id={`element-${element.id.value}`}
      role="group"
      aria-label={ariaLabel ?? describeElement(element)}
      aria-current={selected ? 'true' : undefined}
      data-selectable="true"
      data-selected={selected}
      data-element-type={element.type}
      data-element-id={element.id.value}
      data-testid={`canvas-item-${element.id.value}`}
      style={style}
    >
      <Renderer element={element} selected={selected} onUpdateElement={onUpdateElement} />
    </Wrapper>
  );
}

export const ElementView = memo(ElementViewComponent);
