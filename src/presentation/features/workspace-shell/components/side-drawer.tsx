import { Dialog, DialogContent } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled, { css, keyframes } from 'styled-components';

export const SIDE_DRAWER_CLASS = 'app-drawer-content';

const slideIn = keyframes`
  from {
    transform: translateX(100%);
  }
  to {
    transform: none;
  }
`;

const Sheet = styled(DialogContent)<{ readonly $size: SideDrawerSize }>`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0;
  width: ${({ $size }) =>
    $size === 'board' ? 'clamp(640px, 60vw, 960px)' : 'clamp(320px, 28vw, 420px)'};
  max-width: 100%;
  height: 100dvh;
  max-block-size: 100dvh;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  overflow-x: hidden;
  border-left: 1px solid ${({ theme }) => theme.canvas.elementBorder};
  border-radius: 0;
  background: ${({ theme }) => theme.canvas.surface};
  box-shadow: ${({ theme }) => theme.shadow.md};
  animation: ${slideIn} ${({ theme }) => theme.motion.duration.base}
    ${({ theme }) => theme.motion.easing.enter};

  @media (max-width: 700px) {
    width: 100%;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  ${({ $size }) =>
    $size === 'default' &&
    css`
      min-width: min(320px, 100%);
    `}
`;

export type SideDrawerSize = 'default' | 'board';

export interface SideDrawerProps {
  readonly open: boolean;
  readonly label: string;
  readonly size?: SideDrawerSize;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

/**
 * Right-anchored modal sheet built on `Dialog`, so the overlay keeps the DS
 * focus trap, scroll lock, focus return, Escape and backdrop dismissal. The
 * panel is portaled and must not participate in the page flex layout: opening
 * it never resizes the board or reflows the top/bottom bars.
 *
 * The overlay/backdrop styling lives in `index.css` under
 * `.rr-dialog:has(.app-drawer-content)` because the DS only exposes class names
 * for the content slot.
 */
export function SideDrawer({
  open,
  label,
  size = 'default',
  onClose,
  children,
}: SideDrawerProps): ReactNode {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      classNames={{ content: SIDE_DRAWER_CLASS }}
    >
      <Sheet $size={size} aria-label={label}>
        {children}
      </Sheet>
    </Dialog>
  );
}
