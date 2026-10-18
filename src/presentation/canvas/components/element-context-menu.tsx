import { DropdownMenu } from '@raulrod/ui';
import { BringToFront, SendToBack } from '@raulrod/icons';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import styled from 'styled-components';

const AnchorTrigger = styled(DropdownMenu.Trigger)`
  position: absolute;
  width: 0;
  height: 0;
  padding: 0;
  border: none;
  opacity: 0;
  pointer-events: none;
`;

export interface ElementContextMenuProps {
  /** Viewport-relative coordinates the menu should appear at. */
  readonly position: { readonly x: number; readonly y: number } | null;
  readonly onBringToFront: () => void;
  readonly onSendToBack: () => void;
  readonly onClose: () => void;
}

export function ElementContextMenu({
  position,
  onBringToFront,
  onSendToBack,
  onClose,
}: ElementContextMenuProps): ReactElement | null {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (position !== null) {
      setOpen(true);
    }
  }, [position]);

  if (position === null) {
    return null;
  }

  return (
    <DropdownMenu
      key={`${position.x}-${position.y}`}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          onClose();
        }
      }}
    >
      <AnchorTrigger
        aria-hidden="true"
        tabIndex={-1}
        style={{ left: position.x, top: position.y }}
      />
      <DropdownMenu.Content placement="bottom-start">
        <DropdownMenu.Item
          onSelect={onBringToFront}
          startIcon={<BringToFront aria-hidden="true" size={16} />}
        >
          Bring to front
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onSelect={onSendToBack}
          startIcon={<SendToBack aria-hidden="true" size={16} />}
        >
          Send to back
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
