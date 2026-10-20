import { Tooltip, VisuallyHidden } from '@raulrod/ui';
import { CloudCheck, LoaderCircle, TriangleAlert } from '@raulrod/icons';
import styled, { keyframes } from 'styled-components';
import type { ReactNode } from 'react';
import { respectReducedMotion } from '../../../styles/preferences';
import type { SyncStatusBadge, SyncStatusIcon } from '../workspace-sync-status';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

type IconTone = 'success' | 'info' | 'danger';

const ICON_TONE: Record<SyncStatusIcon, IconTone> = {
  'cloud-check': 'success',
  spinner: 'info',
  alert: 'danger',
};

const StyledIcon = styled.span<{ $icon: SyncStatusIcon }>`
  display: inline-flex;
  align-items: center;
  color: ${({ theme, $icon }) => theme.color.text[ICON_TONE[$icon]]};

  svg {
    width: 16px;
    height: 16px;
  }
`;

const SpinnerIcon = styled(StyledIcon)`
  animation: ${spin} 0.8s linear infinite;
  ${respectReducedMotion}
`;

function renderIcon(icon: SyncStatusIcon): ReactNode {
  switch (icon) {
    case 'cloud-check':
      return <CloudCheck aria-hidden="true" size={16} />;
    case 'spinner':
      return <LoaderCircle aria-hidden="true" size={16} />;
    case 'alert':
      return <TriangleAlert aria-hidden="true" size={16} />;
  }
}

export interface SyncStatusIndicatorProps {
  readonly status: SyncStatusBadge;
}

export function SyncStatusIndicator({ status }: SyncStatusIndicatorProps): ReactNode {
  const Icon = status.icon === 'spinner' ? SpinnerIcon : StyledIcon;
  return (
    <span role="status" aria-live="polite" data-testid="sync-status">
      <Tooltip content={status.label} placement="bottom">
        <Icon $icon={status.icon}>{renderIcon(status.icon)}</Icon>
      </Tooltip>
      <VisuallyHidden>{status.label}</VisuallyHidden>
    </span>
  );
}
