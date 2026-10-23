import { Inline, Popover, Text, Tooltip } from '@raulrod/ui';
import { Maximize, Minus, Plus, Redo2, Undo2 } from '@raulrod/icons';
import type { ChangeEvent, ReactElement } from 'react';
import { useSyncExternalStore } from 'react';
import styled from 'styled-components';
import type { CanvasViewportStore } from '../../../application/services';
import { MAX_CANVAS_SCALE, MIN_CANVAS_SCALE } from '../../../application/services';
import { NeutralButton, NeutralIconButton } from '../../components';
import { useI18n } from '../../i18n';

const ICON_SIZE = 16;
const SLIDER_STEPS = 1000;
const ZOOM_RATIO = MAX_CANVAS_SCALE / MIN_CANVAS_SCALE;
const ZOOM_STEP = 1.2;

export function scaleToSliderValue(scale: number): number {
  const clamped = Math.min(Math.max(scale, MIN_CANVAS_SCALE), MAX_CANVAS_SCALE);
  const ratio = Math.log(clamped / MIN_CANVAS_SCALE) / Math.log(ZOOM_RATIO);
  return Math.round(ratio * SLIDER_STEPS);
}

export function sliderValueToScale(value: number): number {
  const ratio = value / SLIDER_STEPS;
  return MIN_CANVAS_SCALE * ZOOM_RATIO ** ratio;
}

const Controls = styled.div`
  position: absolute;
  bottom: ${({ theme }) => theme.space[5]};
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  display: flex;
  gap: ${({ theme }) => theme.space[2]};
  align-items: center;
  padding: ${({ theme }) => theme.space[1]};
  border-radius: var(--stitch-radius-panel, var(--rr-radius-md));
  background: var(--stitch-panel-bg, var(--cach-floating-surface));
  border: 1px solid var(--stitch-panel-border, ${({ theme }) => theme.color.border.default});
  box-shadow: var(--stitch-panel-shadow, ${({ theme }) => theme.shadow.md});
  backdrop-filter: blur(var(--stitch-panel-blur));

  @media (max-width: 900px) {
    width: max-content;
    max-width: calc(100% - ${({ theme }) => theme.space[4]} * 2);
  }
`;

const Group = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
`;

const Separator = styled.span`
  width: 1px;
  height: 20px;
  background: var(--stitch-panel-border, ${({ theme }) => theme.canvas.elementBorder});
`;

const ZoomTrigger = styled(Popover.Trigger)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 5ch;
  padding: ${({ theme }) => theme.space[1]} ${({ theme }) => theme.space[2]};
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.text.primary};

  &:hover {
    background: var(--cach-control-hover);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
`;

const ZoomPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 200px;
`;

const ZoomValue = styled(Text)`
  font-variant-numeric: tabular-nums;
`;

const ZoomSlider = styled.input`
  display: block;
  width: 100%;
  margin: 0;
  accent-color: ${({ theme }) => theme.color.action.primary.background};
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
`;

export interface ViewportControlsProps {
  readonly store: CanvasViewportStore;
  readonly canUndo?: boolean;
  readonly canRedo?: boolean;
  readonly onUndo?: () => void;
  readonly onRedo?: () => void;
}

export function ViewportControls({
  store,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: ViewportControlsProps): ReactElement {
  const { t } = useI18n();
  const viewport = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const zoomPercentage = Math.round(viewport.scale * 100);
  const canZoomOut = viewport.scale > MIN_CANVAS_SCALE;
  const canZoomIn = viewport.scale < MAX_CANVAS_SCALE;

  const handleZoomChange = (event: ChangeEvent<HTMLInputElement>): void => {
    store.setScale(sliderValueToScale(Number(event.target.value)));
  };

  const handleZoomOut = (): void => {
    store.setScale(viewport.scale / ZOOM_STEP);
  };

  const handleZoomIn = (): void => {
    store.setScale(viewport.scale * ZOOM_STEP);
  };

  return (
    <Controls data-testid="viewport-controls">
      <Group>
        <Tooltip content={t('canvas.undo')} placement="top">
          <NeutralIconButton
            type="button"
            variant="ghost"
            size="sm"
            label={t('canvas.undo')}
            disabled={!canUndo}
            onClick={onUndo}
          >
            <Undo2 aria-hidden="true" size={ICON_SIZE} />
          </NeutralIconButton>
        </Tooltip>
        <Tooltip content={t('canvas.redo')} placement="top">
          <NeutralIconButton
            type="button"
            variant="ghost"
            size="sm"
            label={t('canvas.redo')}
            disabled={!canRedo}
            onClick={onRedo}
          >
            <Redo2 aria-hidden="true" size={ICON_SIZE} />
          </NeutralIconButton>
        </Tooltip>
      </Group>
      <Separator aria-hidden="true" />
      <Group>
        <Tooltip content={t('canvas.zoomOut')} placement="top">
          <NeutralIconButton
            type="button"
            variant="ghost"
            size="sm"
            label={t('canvas.zoomOut')}
            disabled={!canZoomOut}
            onClick={handleZoomOut}
            data-testid="zoom-out"
          >
            <Minus aria-hidden="true" size={ICON_SIZE} />
          </NeutralIconButton>
        </Tooltip>
        <Popover>
          <ZoomTrigger
            data-testid="zoom-level"
            aria-label={t('canvas.zoomLevelAdjust', { percent: zoomPercentage })}
            aria-live="polite"
          >
            {zoomPercentage}%
          </ZoomTrigger>
          <Popover.Content placement="top">
            <ZoomPanel>
              <Inline justify="between" align="center">
                <Popover.Title>{t('canvas.zoom')}</Popover.Title>
                <ZoomValue>{zoomPercentage}%</ZoomValue>
              </Inline>
              <ZoomSlider
                type="range"
                min={0}
                max={SLIDER_STEPS}
                step={1}
                value={scaleToSliderValue(viewport.scale)}
                onChange={handleZoomChange}
                aria-label={t('canvas.zoomLevel')}
                aria-valuetext={`${zoomPercentage}%`}
              />
            </ZoomPanel>
          </Popover.Content>
        </Popover>
        <Tooltip content={t('canvas.zoomIn')} placement="top">
          <NeutralIconButton
            type="button"
            variant="ghost"
            size="sm"
            label={t('canvas.zoomIn')}
            disabled={!canZoomIn}
            onClick={handleZoomIn}
            data-testid="zoom-in"
          >
            <Plus aria-hidden="true" size={ICON_SIZE} />
          </NeutralIconButton>
        </Tooltip>
      </Group>
      <Separator aria-hidden="true" />
      <NeutralButton
        type="button"
        variant="ghost"
        size="sm"
        aria-label={t('canvas.resetView')}
        onClick={() => store.reset()}
      >
        <Inline gap="space-2" align="center">
          <Maximize aria-hidden="true" size={ICON_SIZE} />
          <Text>{t('canvas.resetView')}</Text>
        </Inline>
      </NeutralButton>
    </Controls>
  );
}
