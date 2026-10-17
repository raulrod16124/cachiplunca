import { DropdownMenu } from '@raulrod/ui';
import { AlignLeft, BringToFront, Check, Minus, Palette, SendToBack, Type } from '@raulrod/icons';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { TEXT_ALIGNS } from '../../../domain/element';
import {
  ALIGN_OPTIONS,
  BOOLEAN_MARK_OPTIONS,
  FONT_FAMILY_OPTIONS,
  TEXT_COLOR_SWATCHES,
  TEXT_FONT_SIZES,
} from '../text-format/text-format-menu-options';
import type { TextFormatAction, TextFormatState } from '../text-format/text-format';

const AnchorTrigger = styled(DropdownMenu.Trigger)`
  position: absolute;
  width: 0;
  height: 0;
  padding: 0;
  border: none;
  opacity: 0;
  pointer-events: none;
`;

const SwatchGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 20px);
  gap: 4px;
  padding: 6px 10px;
`;

const SwatchButton = styled.button<{ $color: string }>`
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ $color }) => $color};
  cursor: pointer;

  &:hover {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
  }
`;

const CustomColorRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  cursor: pointer;
`;

const CustomColorInput = styled.input`
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: none;
  cursor: pointer;
`;

export interface TextFormatMenuSection {
  readonly state: TextFormatState;
  readonly onAction: (action: TextFormatAction) => void;
}

export interface ElementContextMenuProps {
  /** Viewport-relative coordinates the menu should appear at. */
  readonly position: { readonly x: number; readonly y: number } | null;
  readonly onBringToFront: () => void;
  readonly onSendToBack: () => void;
  readonly onClose: () => void;
  readonly format?: TextFormatMenuSection | null;
}

function markIndicator(active: boolean, mixed: boolean): ReactElement | undefined {
  if (active) {
    return <Check aria-hidden="true" size={16} />;
  }
  if (mixed) {
    return <Minus aria-hidden="true" size={16} />;
  }
  return undefined;
}

export function ElementContextMenu({
  position,
  onBringToFront,
  onSendToBack,
  onClose,
  format,
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
        {format == null ? null : (
          <>
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger startIcon={<Type aria-hidden="true" size={16} />}>
                Font
              </DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                {FONT_FAMILY_OPTIONS.map((option) => (
                  <DropdownMenu.Item
                    key={option.value}
                    onSelect={() => format.onAction({ kind: 'fontFamily', value: option.value })}
                    endIcon={
                      format.state.fontFamily === option.value ? (
                        <Check aria-hidden="true" size={16} />
                      ) : undefined
                    }
                    style={option.css === 'inherit' ? undefined : { fontFamily: option.css }}
                  >
                    {option.label}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger startIcon={<Type aria-hidden="true" size={16} />}>
                Font size
              </DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                {TEXT_FONT_SIZES.map((size) => (
                  <DropdownMenu.Item
                    key={size}
                    onSelect={() => format.onAction({ kind: 'fontSize', value: size })}
                    endIcon={
                      format.state.fontSize === size ? (
                        <Check aria-hidden="true" size={16} />
                      ) : undefined
                    }
                  >
                    {size}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger startIcon={<Palette aria-hidden="true" size={16} />}>
                Text color
              </DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                <SwatchGrid>
                  {TEXT_COLOR_SWATCHES.map((color) => (
                    <SwatchButton
                      key={color}
                      type="button"
                      $color={color}
                      aria-label={`Text color ${color}`}
                      onClick={() => format.onAction({ kind: 'color', value: color })}
                    />
                  ))}
                </SwatchGrid>
                <CustomColorRow>
                  <CustomColorInput
                    type="color"
                    aria-label="Custom text color"
                    value={format.state.color ?? '#000000'}
                    onChange={(event) =>
                      format.onAction({ kind: 'color', value: event.target.value })
                    }
                  />
                  Custom…
                </CustomColorRow>
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
            {BOOLEAN_MARK_OPTIONS.map((option) => (
              <DropdownMenu.Item
                key={option.mark}
                onSelect={() => format.onAction({ kind: 'toggleMark', mark: option.mark })}
                startIcon={option.icon}
                endIcon={markIndicator(
                  format.state[option.mark] === 'on',
                  format.state[option.mark] === 'mixed',
                )}
              >
                {option.label}
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger startIcon={<AlignLeft aria-hidden="true" size={16} />}>
                Alignment
              </DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                {TEXT_ALIGNS.map((align) => {
                  const option = ALIGN_OPTIONS.find((candidate) => candidate.value === align);

                  return (
                    <DropdownMenu.Item
                      key={align}
                      onSelect={() => format.onAction({ kind: 'align', value: align })}
                      startIcon={option?.icon}
                      endIcon={
                        format.state.align === align ? (
                          <Check aria-hidden="true" size={16} />
                        ) : undefined
                      }
                    >
                      {option?.label ?? align}
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
