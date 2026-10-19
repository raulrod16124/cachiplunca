import type { ReactElement } from 'react';
import styled from 'styled-components';
import type { ResizeHandleAnchor, SelectableItem } from '../../../application/services';
import type { Bounds } from '../../../domain/shared';

const Overlay = styled.div`
  position: absolute;
  box-sizing: border-box;
  border: 1.5px solid ${({ theme }) => theme.canvas.selection};
  pointer-events: none;
`;

const Handle = styled.span`
  position: absolute;
  width: 8px;
  height: 8px;
  box-sizing: border-box;
  border: 1.5px solid ${({ theme }) => theme.canvas.selection};
  border-radius: 2px;
  background: ${({ theme }) => theme.canvas.handleFill};
  pointer-events: auto;
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
}

function unionBounds(items: readonly SelectableItem[]): Bounds {
  return items
    .map((item) => item.bounds)
    .reduce((accumulator, bounds) => accumulator.union(bounds));
}

export function SelectionOverlay({ items }: SelectionOverlayProps): ReactElement | null {
  if (items.length === 0) {
    return null;
  }

  const bounds = unionBounds(items);
  const isSingle = items.length === 1;
  const connectorEndpoints = isSingle ? items[0]?.connectorEndpoints : undefined;
  const isConnector = isSingle && items[0]?.segment !== undefined;

  return (
    <Overlay
      data-testid="selection-overlay"
      data-selection-count={items.length}
      data-selected-ids={items.map((item) => item.id).join(',')}
      data-selected-id={isSingle ? items[0]?.id : undefined}
      aria-hidden="true"
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
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
              style={{ ...handleStyle(anchor), cursor: HANDLE_CURSORS[anchor] }}
            />
          ))
        : null}
    </Overlay>
  );
}
