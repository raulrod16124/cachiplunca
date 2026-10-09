import type { ReactElement } from 'react';
import styled from 'styled-components';
import type { SelectableItem } from '../../../application/services';

const ACCENT = 'var(--rr-color-accent-default, #2563eb)';
const SURFACE = 'var(--rr-color-background-default, #ffffff)';

const Overlay = styled.div`
  position: absolute;
  box-sizing: border-box;
  border: 1.5px solid ${ACCENT};
  pointer-events: none;
`;

const Handle = styled.span`
  position: absolute;
  width: 8px;
  height: 8px;
  box-sizing: border-box;
  border: 1.5px solid ${ACCENT};
  border-radius: 2px;
  background: ${SURFACE};
`;

type HandleAnchor =
  'top-left' | 'top' | 'top-right' | 'right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'left';

const HANDLE_OFFSETS: Record<HandleAnchor, { readonly x: number; readonly y: number }> = {
  'top-left': { x: 0, y: 0 },
  top: { x: 0.5, y: 0 },
  'top-right': { x: 1, y: 0 },
  right: { x: 1, y: 0.5 },
  'bottom-right': { x: 1, y: 1 },
  bottom: { x: 0.5, y: 1 },
  'bottom-left': { x: 0, y: 1 },
  left: { x: 0, y: 0.5 },
};

const HANDLE_ANCHORS = Object.keys(HANDLE_OFFSETS) as readonly HandleAnchor[];

function handleStyle(anchor: HandleAnchor): { readonly left: string; readonly top: string } {
  const offset = HANDLE_OFFSETS[anchor];

  return {
    left: `calc(${offset.x * 100}% - 4px)`,
    top: `calc(${offset.y * 100}% - 4px)`,
  };
}

export interface SelectionOverlayProps {
  readonly item: SelectableItem | null;
}

export function SelectionOverlay({ item }: SelectionOverlayProps): ReactElement | null {
  if (item === null) {
    return null;
  }

  return (
    <Overlay
      data-testid="selection-overlay"
      data-selected-id={item.id}
      aria-hidden="true"
      style={{
        left: item.bounds.x,
        top: item.bounds.y,
        width: item.bounds.width,
        height: item.bounds.height,
      }}
    >
      {HANDLE_ANCHORS.map((anchor) => (
        <Handle key={anchor} style={handleStyle(anchor)} />
      ))}
    </Overlay>
  );
}
