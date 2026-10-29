import type { ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import { useI18n } from '../i18n';
import { respectReducedMotion } from '../styles/preferences';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const SpinnerRing = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: ${({ theme }) => theme.color.action.primary.background};
  border-right-color: ${({ theme }) => theme.color.action.primary.background};
  border-radius: 9999px;
  animation: ${spin} 0.8s linear infinite;
  ${respectReducedMotion}
`;

export interface SpinnerProps {
  size?: 'sm' | 'md';
  label?: string;
  decorative?: boolean;
}

const sizeMap = {
  sm: '12px',
  md: '16px',
} as const;

export function Spinner({ size = 'md', label, decorative = false }: SpinnerProps): ReactNode {
  const { t } = useI18n();
  const dimension = sizeMap[size];
  const resolvedLabel = label ?? t('common.loading');

  if (decorative) {
    return (
      <div aria-hidden="true" data-testid="spinner">
        <SpinnerRing style={{ width: dimension, height: dimension }} />
      </div>
    );
  }

  return (
    <div role="status" aria-label={resolvedLabel} aria-live="polite" data-testid="spinner">
      <SpinnerRing style={{ width: dimension, height: dimension }} />
    </div>
  );
}
