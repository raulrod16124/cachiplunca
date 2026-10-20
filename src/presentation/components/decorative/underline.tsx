import type { ReactNode } from 'react';
import { brandVar } from '../../styles/brand/brand-tokens';
import { DecorativeSvg } from './root';
import type { DecorativeProps, DecorativeSize } from './types';

const DIMENSIONS: Record<DecorativeSize, { readonly width: number; readonly height: number }> = {
  sm: { width: 48, height: 6 },
  md: { width: 80, height: 10 },
  lg: { width: 120, height: 14 },
};

export function DecorativeUnderline({
  color = 'orange-500',
  size = 'md',
  className,
}: DecorativeProps): ReactNode {
  const dimension = DIMENSIONS[size];

  return (
    <DecorativeSvg
      $width={dimension.width}
      $height={dimension.height}
      viewBox="0 0 120 14"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M3 10 C30 3 78 3 117 7"
        stroke={brandVar(color)}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </DecorativeSvg>
  );
}
