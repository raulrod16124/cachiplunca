import { Button, IconButton, Inline, Popover, Text, Tooltip } from '@raulrod/ui';
import { Maximize, Redo2, Undo2 } from '@raulrod/icons';
import type { ChangeEvent, ReactElement } from 'react';
import { useSyncExternalStore } from 'react';
import styled from 'styled-components';
import type { CanvasViewportStore } from '../../../application/services';
import { MAX_CANVAS_SCALE, MIN_CANVAS_SCALE } from '../../../application/services';

const ICON_SIZE = 16;
const SLIDER_STEPS = 1000;
const ZOOM_RATIO = MAX_CANVAS_SCALE / MIN_CANVAS_SCALE;

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
  bottom: ${({ theme }) => theme.space[4]};
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  display: flex;
  gap: ${({ theme }) => theme.space[2]};
  align-items: center;
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[2]}`};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.canvas.surface};
  border: 1px solid ${({ theme }) => theme.canvas.elementBorder};
  box-shadow: ${({ theme }) => theme.shadow.sm};
`;

const Group = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
`;

const Separator = styled.span`
  width: 1px;
  height: 20px;
  background: ${({ theme }) => theme.canvas.elementBorder};
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
    background: ${({ theme }) => theme.color.background.sunken};
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
  const viewport = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const zoomPercentage = Math.round(viewport.scale * 100);

  const handleZoomChange = (event: ChangeEvent<HTMLInputElement>): void => {
    store.setScale(sliderValueToScale(Number(event.target.value)));
  };

  return (
    <Controls data-testid="viewport-controls">
      <Group>
        <Tooltip content="Undo" placement="top">
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            label="Undo"
            disabled={!canUndo}
            onClick={onUndo}
          >
            <Undo2 aria-hidden="true" size={ICON_SIZE} />
          </IconButton>
        </Tooltip>
        <Tooltip content="Redo" placement="top">
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            label="Redo"
            disabled={!canRedo}
            onClick={onRedo}
          >
            <Redo2 aria-hidden="true" size={ICON_SIZE} />
          </IconButton>
        </Tooltip>
      </Group>
      <Separator aria-hidden="true" />
      <Popover>
        <ZoomTrigger
          data-testid="zoom-level"
          aria-label={`Zoom level ${zoomPercentage}%, adjust`}
          aria-live="polite"
        >
          {zoomPercentage}%
        </ZoomTrigger>
        <Popover.Content placement="top">
          <ZoomPanel>
            <Inline justify="between" align="center">
              <Popover.Title>Zoom</Popover.Title>
              <ZoomValue>{zoomPercentage}%</ZoomValue>
            </Inline>
            <ZoomSlider
              type="range"
              min={0}
              max={SLIDER_STEPS}
              step={1}
              value={scaleToSliderValue(viewport.scale)}
              onChange={handleZoomChange}
              aria-label="Zoom level"
              aria-valuetext={`${zoomPercentage}%`}
            />
          </ZoomPanel>
        </Popover.Content>
      </Popover>
      <Separator aria-hidden="true" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Reset view"
        onClick={() => store.reset()}
      >
        <Inline gap="space-2" align="center">
          <Maximize aria-hidden="true" size={ICON_SIZE} />
          <Text>Reset view</Text>
        </Inline>
      </Button>
    </Controls>
  );
}
