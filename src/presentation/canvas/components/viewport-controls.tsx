import { Button, Inline, Text } from '@raulrod/ui';
import { Maximize } from '@raulrod/icons';
import type { ReactElement } from 'react';
import { useSyncExternalStore } from 'react';
import styled from 'styled-components';
import type { CanvasViewportStore } from '../../../application/services';

const Controls = styled.div`
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 4px 8px;
  border-radius: 8px;
  background: var(--rr-color-background-default, #ffffff);
  border: 1px solid var(--rr-color-border-default, #e2e8f0);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
`;

const ZoomLabel = styled(Text)`
  min-width: 3ch;
  text-align: center;
  font-variant-numeric: tabular-nums;
`;

export interface ViewportControlsProps {
  readonly store: CanvasViewportStore;
}

export function ViewportControls({ store }: ViewportControlsProps): ReactElement {
  const viewport = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const zoomPercentage = Math.round(viewport.scale * 100);

  return (
    <Controls>
      <ZoomLabel aria-label="Zoom level" aria-live="polite">
        {zoomPercentage}%
      </ZoomLabel>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Reset view"
        onClick={() => store.reset()}
      >
        <Inline gap="space-2" align="center">
          <Maximize aria-hidden="true" size={16} />
          <Text>Reset view</Text>
        </Inline>
      </Button>
    </Controls>
  );
}
