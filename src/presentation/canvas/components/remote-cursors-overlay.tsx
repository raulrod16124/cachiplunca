import type { ReactElement } from 'react';
import styled from 'styled-components';
import type { RemoteCursor } from '../../../application/services';
import type { Viewport } from '../../../domain/shared';
import { presenceColorFor, PRESENCE_TEXT_COLOR, userLabel } from '../../collaboration';

const Layer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
`;

const Cursor = styled.div`
  position: absolute;
  pointer-events: none;
  transform: translate(-2px, -2px);
  will-change: transform;
`;

const Pointer = styled.svg`
  display: block;
  width: 20px;
  height: 20px;
  filter: var(
    --stitch-cursor-shadow,
    drop-shadow(
      0 1px 1px color-mix(in srgb, ${({ theme }) => theme.color.text.primary} 35%, transparent)
    )
  );
`;

const Label = styled.span`
  display: inline-block;
  margin-top: 2px;
  padding: 2px 9px;
  border-radius: ${({ theme }) => theme.radius.full};
  border-top-left-radius: 2px;
  background-color: inherit;
  box-shadow: ${({ theme }) => theme.shadow.sm};
  font-size: 11px;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  line-height: 16px;
  white-space: nowrap;
  color: ${PRESENCE_TEXT_COLOR};
`;

function colorFromUserId(userId: string): string {
  return presenceColorFor(userId);
}

export interface RemoteCursorsOverlayProps {
  readonly cursors: readonly RemoteCursor[];
  readonly viewport: Viewport;
  readonly userColors?: ReadonlyMap<string, string>;
}

export function RemoteCursorsOverlay({
  cursors,
  viewport,
  userColors,
}: RemoteCursorsOverlayProps): ReactElement | null {
  if (cursors.length === 0) {
    return null;
  }

  return (
    <Layer data-testid="remote-cursors-overlay" aria-hidden="true">
      {cursors.map((cursor) => {
        const screen = viewport.worldToScreen(cursor.position);
        const color = userColors?.get(cursor.userId) ?? colorFromUserId(cursor.userId);
        const label = userLabel(cursor.displayName, cursor.userId);

        return (
          <Cursor
            key={cursor.userId}
            data-testid="remote-cursor"
            data-user-id={cursor.userId}
            data-user-color={color}
            style={{ left: screen.x, top: screen.y }}
          >
            <Pointer viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 1l11 6-4.5 1.6L7 14 2 1z" fill={color} />
            </Pointer>
            <Label style={{ backgroundColor: color }}>{label}</Label>
          </Cursor>
        );
      })}
    </Layer>
  );
}
