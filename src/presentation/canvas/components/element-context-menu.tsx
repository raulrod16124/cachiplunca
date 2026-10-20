import { DropdownMenu } from '@raulrod/ui';
import { BringToFront, Check, ClipboardList, Palette, SendToBack } from '@raulrod/icons';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useI18n } from '../../i18n';
import { NOTE_COLOR_PALETTE } from '../note-colors';

const AnchorTrigger = styled(DropdownMenu.Trigger)`
  position: absolute;
  width: 0;
  height: 0;
  padding: 0;
  border: none;
  opacity: 0;
  pointer-events: none;
`;

const Swatch = styled.span<{ $color: string }>`
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ $color }) => $color};
`;

const DefaultSwatch = styled.span`
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.canvas.surface};
`;

export interface ElementContextMenuNoteColor {
  readonly currentColor: string | undefined;
  readonly onSelect: (color: string) => void;
  readonly onClear: () => void;
}

export interface ElementContextMenuCreateTask {
  readonly elementType: 'note' | 'frame';
  readonly disabled: boolean;
  readonly onSelect: () => void;
}

export interface ElementContextMenuProps {
  /** Viewport-relative coordinates the menu should appear at. */
  readonly position: { readonly x: number; readonly y: number } | null;
  readonly onBringToFront: () => void;
  readonly onSendToBack: () => void;
  /** Present only when the menu targets a writable note. */
  readonly noteColor?: ElementContextMenuNoteColor;
  /** Present only when the menu targets a writable note or frame. */
  readonly createTask?: ElementContextMenuCreateTask;
  readonly onClose: () => void;
}

export function ElementContextMenu({
  position,
  onBringToFront,
  onSendToBack,
  noteColor,
  createTask,
  onClose,
}: ElementContextMenuProps): ReactElement | null {
  const { t } = useI18n();
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
        {createTask === undefined ? null : (
          <>
            <DropdownMenu.Item
              onSelect={createTask.onSelect}
              disabled={createTask.disabled}
              startIcon={<ClipboardList aria-hidden="true" size={16} />}
            >
              {t(
                createTask.elementType === 'note'
                  ? 'canvas.contextMenu.createTaskFromNote'
                  : 'canvas.contextMenu.createTaskFromFrame',
              )}
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
          </>
        )}
        {noteColor === undefined ? null : (
          <>
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger startIcon={<Palette aria-hidden="true" size={16} />}>
                {t('canvas.contextMenu.noteColor')}
              </DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                <DropdownMenu.Item
                  onSelect={noteColor.onClear}
                  startIcon={<DefaultSwatch aria-hidden="true" />}
                  endIcon={
                    noteColor.currentColor === undefined ? (
                      <Check aria-hidden="true" size={16} />
                    ) : undefined
                  }
                  aria-current={noteColor.currentColor === undefined ? 'true' : undefined}
                >
                  {t('canvas.contextMenu.noteColorDefault')}
                </DropdownMenu.Item>
                {NOTE_COLOR_PALETTE.map((option) => {
                  const isCurrent = noteColor.currentColor === option.color;

                  return (
                    <DropdownMenu.Item
                      key={option.id}
                      onSelect={() => noteColor.onSelect(option.color)}
                      startIcon={<Swatch aria-hidden="true" $color={option.color} />}
                      endIcon={isCurrent ? <Check aria-hidden="true" size={16} /> : undefined}
                      aria-current={isCurrent ? 'true' : undefined}
                    >
                      {t(option.labelKey)}
                    </DropdownMenu.Item>
                  );
                })}
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
            <DropdownMenu.Separator />
          </>
        )}
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
