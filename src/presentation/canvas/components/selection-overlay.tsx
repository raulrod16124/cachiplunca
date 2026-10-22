import type { ReactElement } from 'react';
import styled from 'styled-components';
import type { ResizeHandleAnchor, SelectableItem } from '../../../application/services';
import { normalizeRotation } from '../../../application/services';
import type { Bounds } from '../../../domain/shared';
import { useI18n } from '../../i18n';

const Overlay = styled.div`
  position: absolute;
  box-sizing: border-box;
  border: 1.5px solid ${({ theme }) => theme.canvas.selection};
  background: ${({ theme }) => theme.canvas.selectionFill};
  pointer-events: none;
`;

const ROTATE_CURSOR_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <g fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 7a8 8 0 1 0 1 6" />
      <path d="M16 3l5 4-5 2" />
    </g>
    <g fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 7a8 8 0 1 0 1 6" />
      <path d="M16 3l5 4-5 2" />
    </g>
  </svg>
`;

const ROTATE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(ROTATE_CURSOR_SVG)}") 12 12, grab`;

const Handle = styled.span`
  position: absolute;
  width: 8px;
  height: 8px;
  box-sizing: border-box;
  border: 1.5px solid ${({ theme }) => theme.canvas.selection};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.canvas.handleFill};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  pointer-events: auto;
`;

const RotateHandle = styled.button`
  position: absolute;
  top: calc(-1 * ${({ theme }) => theme.space[4]} - 5px);
  left: 50%;
  width: 10px;
  height: 10px;
  box-sizing: border-box;
  padding: 0;
  transform: translate(-50%, -50%);
  border: 1.5px solid ${({ theme }) => theme.canvas.selection};
  border-radius: 50%;
  background: ${({ theme }) => theme.canvas.handleFill};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  cursor: ${ROTATE_CURSOR};
  pointer-events: auto;

  &[data-dragging='true'] {
    cursor: ${ROTATE_CURSOR};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
`;

const ConnectorHandle = styled(Handle)`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  cursor: grab;

  &[data-dragging='true'] {
    cursor: grabbing;
  }
`;

const HANDLE_OFFSETS: Record<ResizeHandleAnchor, { readonly x: number; readonly y: number }> = {
  'top-left': { x: 0, y: 0 },
  top: { x: 0.5, y: 0 },
  'top-right': { x: 1, y: 0 },
  right: { x: 1, y: 0.5 },
  'bottom-right': { x: 1, y: 1 },
  bottom: { x: 0.5, y: 1 },
  'bottom-left': { x: 0, y: 1 },
  left: { x: 0, y: 0.5 },
};

const HANDLE_CURSORS: Record<ResizeHandleAnchor, string> = {
  'top-left': 'nwse-resize',
  top: 'ns-resize',
  'top-right': 'nesw-resize',
  right: 'ew-resize',
  'bottom-right': 'nwse-resize',
  bottom: 'ns-resize',
  'bottom-left': 'nesw-resize',
  left: 'ew-resize',
};

const HANDLE_ANCHORS = Object.keys(HANDLE_OFFSETS) as readonly ResizeHandleAnchor[];

function handleStyle(anchor: ResizeHandleAnchor): { readonly left: string; readonly top: string } {
  const offset = HANDLE_OFFSETS[anchor];

  return {
    left: `calc(${offset.x * 100}% - 4px)`,
    top: `calc(${offset.y * 100}% - 4px)`,
  };
}

export interface SelectionOverlayProps {
  readonly items: readonly SelectableItem[];
  readonly canRotate?: boolean;
}

function unionBounds(items: readonly SelectableItem[]): Bounds {
  return items
    .map((item) => item.bounds)
    .reduce((accumulator, bounds) => accumulator.union(bounds));
}

export function SelectionOverlay({
  items,
  canRotate = false,
}: SelectionOverlayProps): ReactElement | null {
  const { t } = useI18n();

  if (items.length === 0) {
    return null;
  }

  const bounds = unionBounds(items);
  const isSingle = items.length === 1;
  const connectorEndpoints = isSingle ? items[0]?.connectorEndpoints : undefined;
  const isConnector = isSingle && items[0]?.segment !== undefined;
  const rotation = isSingle && !isConnector ? (items[0]?.rotation ?? 0) : 0;
  const displayRotation = normalizeRotation(rotation);
  const showRotateHandle = canRotate && isSingle && !isConnector;
  const rotateLabel = t('canvas.rotateHandle');

  return (
    <Overlay
      data-testid="selection-overlay"
      data-selection-count={items.length}
      data-selected-ids={items.map((item) => item.id).join(',')}
      data-selected-id={isSingle ? items[0]?.id : undefined}
      data-rotation={displayRotation}
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        transform: displayRotation === 0 ? undefined : `rotate(${displayRotation}deg)`,
      }}
    >
      {connectorEndpoints !== undefined
        ? connectorEndpoints.map((endpoint) => (
            <ConnectorHandle
              key={endpoint.side}
              data-connector-endpoint="true"
              data-connector-endpoint-side={endpoint.side}
              aria-hidden="true"
              style={{
                left: endpoint.position.x - bounds.x - 5,
                top: endpoint.position.y - bounds.y - 5,
              }}
            />
          ))
        : null}
      {isSingle && !isConnector
        ? HANDLE_ANCHORS.map((anchor) => (
            <Handle
              key={anchor}
              data-resize-handle="true"
              data-resize-anchor={anchor}
              aria-hidden="true"
              style={{ ...handleStyle(anchor), cursor: HANDLE_CURSORS[anchor] }}
            />
          ))
        : null}
      {showRotateHandle ? (
        <RotateHandle
          type="button"
          data-rotate-handle="true"
          data-testid="rotate-handle"
          aria-label={rotateLabel}
          title={rotateLabel}
          style={{
            transform: `translate(-50%, -50%) rotate(${-displayRotation}deg)`,
          }}
        />
      ) : null}
    </Overlay>
  );
}
