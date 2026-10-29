import { Inline, Skeleton, Stack, Text, VisuallyHidden } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { useI18n } from '../i18n';
import type { StateTone } from './state-shared';

export interface LoadingStateProps {
  message?: string;
  label?: string;
  tone?: StateTone;
  children?: ReactNode;
}

const StatusRoot = styled(Stack)`
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
`;

const Dot = styled(Skeleton)<{ $tone: StateTone }>`
  flex: none;
  background-color: ${({ theme, $tone }) => {
    if ($tone === 'brand') {
      return theme.color.action.secondary.background;
    }
    if ($tone === 'danger') {
      return theme.color.text.destructive;
    }
    return theme.color.background.sunken;
  }};
`;

export function LoadingState({
  message,
  label,
  tone = 'neutral',
  children,
}: LoadingStateProps): ReactNode {
  const { t } = useI18n();
  const resolvedMessage = message ?? t('common.loading');

  if (children !== undefined) {
    return (
      <StatusRoot gap="space-2" role="status" aria-live="polite" aria-busy="true">
        {label ? <VisuallyHidden>{label}</VisuallyHidden> : null}
        {children}
      </StatusRoot>
    );
  }

  return (
    <StatusRoot
      gap="space-2"
      role="status"
      aria-live="polite"
      aria-busy="true"
      align="center"
      justify="center"
    >
      {label ? <VisuallyHidden>{label}</VisuallyHidden> : null}
      <Inline gap="space-1" align="center">
        <Dot $tone={tone} variant="circle" style={{ width: '8px', height: '8px' }} />
        <Dot $tone={tone} variant="circle" style={{ width: '8px', height: '8px' }} />
        <Dot $tone={tone} variant="circle" style={{ width: '8px', height: '8px' }} />
      </Inline>
      {resolvedMessage !== '' ? <Text color="color.text.muted">{resolvedMessage}</Text> : null}
    </StatusRoot>
  );
}
