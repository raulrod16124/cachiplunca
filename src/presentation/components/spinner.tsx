import styled, { keyframes } from 'styled-components';
import type { ReactNode } from 'react';

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
`;

export interface SpinnerProps {
  size?: 'sm' | 'md';
  label?: string;
}

const sizeMap = {
  sm: '12px',
  md: '16px',
} as const;

export function Spinner({ size = 'md', label = 'Loading' }: SpinnerProps): ReactNode {
  const dimension = sizeMap[size];
  return (
    <div role="status" aria-label={label} aria-live="polite">
      <SpinnerRing style={{ width: dimension, height: dimension }} />
    </div>
  );
}
