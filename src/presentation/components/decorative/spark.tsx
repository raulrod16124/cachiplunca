import type { ReactNode } from 'react';
import { brandVar } from '../../styles/brand/brand-tokens';
import { DecorativeSvg } from './root';
import type { DecorativeProps, DecorativeSize } from './types';

const DIMENSIONS: Record<DecorativeSize, number> = {
  sm: 12,
  md: 20,
  lg: 32,
};

export function DecorativeSpark({
  color = 'mustard-500',
  size = 'md',
  className,
}: DecorativeProps): ReactNode {
  const dimension = DIMENSIONS[size];

  return (
    <DecorativeSvg
      $width={dimension}
      $height={dimension}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M12 2.5 L14.4 8.9 L21 11.2 L14.4 13.5 L12 20 L9.6 13.5 L3 11.2 L9.6 8.9 Z"
        fill={brandVar(color)}
      />
    </DecorativeSvg>
  );
}
