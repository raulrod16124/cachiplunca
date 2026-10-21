import { MessageSquare } from '@raulrod/icons';
import type { CSSProperties, ReactElement } from 'react';
import { memo, useMemo } from 'react';
import styled from 'styled-components';
import type { UpdateElementInput } from '../../../application/commands';
import type { Element } from '../../../domain/element';
import { Bounds, Position, type Size } from '../../../domain/shared';
import { describeElement } from '../accessibility';
import { useI18n } from '../../i18n';
import type { ConnectorRenderGeometry, ElementRendererRegistry } from './element-renderer';
import { elementTypeLabelKey } from './element-type-label';
import { resolveElementRenderer } from './resolve-element-renderer';

const Wrapper = styled.div`
  position: absolute;
  box-sizing: border-box;
  transform-origin: center center;
  will-change: transform;

  &[data-selected='true'] > [data-element-type-label='true'],
  &:hover > [data-element-type-label='true'],
  &:focus-within > [data-element-type-label='true'] {
    opacity: 1;
  }
`;

const ContentLayer = styled.div<{ $allowOverflow: boolean }>`
  position: absolute;
  inset: 0;
  contain: ${({ $allowOverflow }) => ($allowOverflow ? 'layout' : 'layout paint')};
`;

const TypeLabel = styled.span`
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translate(-50%, ${({ theme }) => theme.space[1]});
  color: ${({ theme }) => theme.color.text.muted};
  font-family: ${({ theme }) => theme.font.family.sans};
  font-size: ${({ theme }) => theme.font.size['2xs']};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  letter-spacing: ${({ theme }) => theme.font.tracking.wide};
  line-height: ${({ theme }) => theme.font.leading.none};
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
  opacity: 0;
`;

const CommentIndicator = styled.button`
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
  min-width: ${({ theme }) => theme.space[5]};
  height: ${({ theme }) => theme.space[5]};
  padding: 0 ${({ theme }) => theme.space[1]};
  transform: translate(40%, -40%);
  border: 1px solid ${({ theme }) => theme.color.border.strong};
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.color.background.warning};
  color: ${({ theme }) => theme.color.text.primary};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  font-family: ${({ theme }) => theme.font.family.sans};
  font-size: ${({ theme }) => theme.font.size['2xs']};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  line-height: ${({ theme }) => theme.font.leading.none};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.background.sunken};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
`;

export interface ElementViewProps {
  readonly element: Element;
  readonly selected: boolean;
  readonly renderers?: ElementRendererRegistry;
  readonly ariaLabel?: string;
  readonly zIndex?: number;
  readonly showTypeLabel?: boolean;
  readonly connectorStart?: Position;
  readonly connectorEnd?: Position;
  readonly assigneeLabel?: string;
  readonly commentCount?: number;
  readonly commentLabel?: string;
  readonly onOpenComments?: (elementId: string) => void;
  readonly onUpdateElement?: (input: UpdateElementInput) => void;
  readonly onResizeElement?: (element: Element, size: Size) => void;
}

function ElementViewComponent({
  element,
  selected,
  renderers,
  ariaLabel,
  zIndex,
  showTypeLabel = true,
  connectorStart,
  connectorEnd,
  assigneeLabel,
  commentCount = 0,
  commentLabel,
  onOpenComments,
  onUpdateElement,
  onResizeElement,
}: ElementViewProps): ReactElement {
  const { t } = useI18n();
  const Renderer = resolveElementRenderer(renderers, element.type);

  const connectorGeometry = useMemo<ConnectorRenderGeometry | undefined>(() => {
    if (connectorStart === undefined || connectorEnd === undefined) {
      return undefined;
    }

    const left = Math.min(connectorStart.x, connectorEnd.x);
    const top = Math.min(connectorStart.y, connectorEnd.y);
    const origin = Position.create(left, top);

    return { start: connectorStart, end: connectorEnd, origin };
  }, [connectorStart, connectorEnd]);

  const style = useMemo<CSSProperties>(() => {
    if (connectorGeometry !== undefined) {
      const bounds = Bounds.fromXYWH(
        connectorGeometry.origin.x,
        connectorGeometry.origin.y,
        Math.abs(connectorGeometry.end.x - connectorGeometry.start.x),
        Math.abs(connectorGeometry.end.y - connectorGeometry.start.y),
      );

      return {
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        transform: `rotate(${element.rotation}deg)`,
        zIndex,
        pointerEvents: 'none',
        contain: 'none',
      };
    }

    return {
      left: element.position.x,
      top: element.position.y,
      width: element.size.width,
      height: element.size.height,
      transform: `rotate(${element.rotation}deg)`,
      zIndex,
    };
  }, [
    connectorGeometry,
    element.position.x,
    element.position.y,
    element.size.width,
    element.size.height,
    element.rotation,
    zIndex,
  ]);

  const typeLabelStyle = useMemo<CSSProperties>(() => {
    const selectedStyle: CSSProperties = selected ? { opacity: 1 } : {};

    if (element.type !== 'connector') {
      return selectedStyle;
    }

    const start = connectorGeometry?.start ?? element.position;
    const end =
      connectorGeometry?.end ??
      Position.create(
        element.position.x + element.size.width,
        element.position.y + element.size.height,
      );
    const origin = connectorGeometry?.origin ?? element.position;

    return {
      ...selectedStyle,
      left: (start.x + end.x) / 2 - origin.x,
      top: (start.y + end.y) / 2 - origin.y,
      transform: 'translate(-50%, -50%)',
    };
  }, [
    connectorGeometry,
    element.position,
    element.size.height,
    element.size.width,
    element.type,
    selected,
  ]);

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
      <ContentLayer $allowOverflow={element.type === 'note'}>
        <Renderer
          element={element}
          selected={selected}
          connectorGeometry={connectorGeometry}
          assigneeLabel={assigneeLabel}
          onUpdateElement={onUpdateElement}
          onResizeElement={onResizeElement}
        />
      </ContentLayer>
      {showTypeLabel ? (
        <TypeLabel
          aria-hidden="true"
          data-element-type-label="true"
          data-testid={`element-type-label-${element.id.value}`}
          style={typeLabelStyle}
        >
          {t(elementTypeLabelKey(element.type))}
        </TypeLabel>
      ) : null}
      {commentCount > 0 && element.type !== 'connector' ? (
        <CommentIndicator
          type="button"
          aria-label={commentLabel}
          title={commentLabel}
          data-testid={`comment-indicator-${element.id.value}`}
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onOpenComments?.(element.id.value);
          }}
        >
          <MessageSquare aria-hidden="true" size={12} />
          <span aria-hidden="true">{commentCount}</span>
        </CommentIndicator>
      ) : null}
    </Wrapper>
  );
}

export const ElementView = memo(ElementViewComponent);
