import { Baseline, ChevronDown } from '@raulrod/icons';
import type { ReactElement } from 'react';
import { useState } from 'react';
import styled from 'styled-components';
import { useI18n } from '../../i18n';
import { TEXT_COLOR_SWATCHES, TEXT_STANDARD_COLORS } from './text-format-options';
import { ToolbarDropdown } from './toolbar-dropdown';
import { ToolbarButton, ToolbarGroup } from './toolbar-primitives';

const MainButton = styled(ToolbarButton)`
  position: relative;
  padding-bottom: 4px;
`;

const ColorBar = styled.span<{ $color: string }>`
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: 3px;
  height: 3px;
  border-radius: 1px;
  background-color: ${({ $color }) => $color};
`;

const SectionLabel = styled.span`
  padding: 4px 8px 2px;
  color: ${({ theme }) => theme.canvas.hintText};
  font-size: ${({ theme }) => theme.font.size.xs};
`;

const SwatchGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 18px);
  gap: 4px;
  padding: 2px 8px 6px;
`;

const SwatchButton = styled.button<{ $color: string }>`
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ $color }) => $color};
  cursor: pointer;

  &:hover {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
`;

const AutomaticRow = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 8px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: none;
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.canvas.surfaceMuted};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
`;

const AutomaticPreview = styled.span`
  width: 18px;
  height: 18px;
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.canvas.surface};
`;

const MoreColorsRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 2px;
  border-top: 1px solid ${({ theme }) => theme.color.border.default};
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  cursor: pointer;
`;

const MoreColorsInput = styled.input`
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: none;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
`;

export interface ColorPickerProps {
  readonly label: string;
  readonly color: string | undefined;
  readonly defaultColor: string;
  readonly onPick: (color: string | null) => void;
  readonly swatches?: readonly string[];
  readonly standardColors?: readonly string[];
}

export function ColorPicker({
  label,
  color,
  defaultColor,
  onPick,
  swatches = TEXT_COLOR_SWATCHES,
  standardColors = TEXT_STANDARD_COLORS,
}: ColorPickerProps): ReactElement {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const activeColor = color ?? defaultColor;

  function pick(next: string | null): void {
    onPick(next);
    setOpen(false);
  }

  return (
    <ToolbarGroup>
      <MainButton
        type="button"
        aria-label={label}
        $active={color !== undefined}
        onClick={() => pick(activeColor)}
      >
        <Baseline aria-hidden="true" size={16} />
        <ColorBar $color={activeColor} />
      </MainButton>
      <ToolbarDropdown
        label={t('canvas.textFormat.colorOptions', { label })}
        open={open}
        onOpenChange={setOpen}
        triggerContent={<ChevronDown aria-hidden="true" size={12} />}
      >
        <AutomaticRow
          type="button"
          aria-label={t('canvas.textFormat.automatic')}
          onClick={() => pick(null)}
        >
          <AutomaticPreview aria-hidden="true" />
          {t('canvas.textFormat.automatic')}
        </AutomaticRow>
        <SectionLabel>{t('canvas.textFormat.themeColors')}</SectionLabel>
        <SwatchGrid>
          {swatches.map((swatch) => (
            <SwatchButton
              key={swatch}
              type="button"
              aria-label={t('canvas.textFormat.themeColor', { color: swatch })}
              $color={swatch}
              onClick={() => pick(swatch)}
            />
          ))}
        </SwatchGrid>
        <SectionLabel>{t('canvas.textFormat.standardColors')}</SectionLabel>
        <SwatchGrid>
          {standardColors.map((swatch) => (
            <SwatchButton
              key={swatch}
              type="button"
              aria-label={t('canvas.textFormat.standardColor', { color: swatch })}
              $color={swatch}
              onClick={() => pick(swatch)}
            />
          ))}
        </SwatchGrid>
        <MoreColorsRow>
          <MoreColorsInput
            type="color"
            aria-label={t('canvas.textFormat.moreColors')}
            value={activeColor}
            onChange={(event) => pick(event.target.value)}
          />
          {t('canvas.textFormat.moreColors')}
        </MoreColorsRow>
      </ToolbarDropdown>
    </ToolbarGroup>
  );
}
