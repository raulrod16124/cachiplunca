import type { ReactNode } from 'react';
import { brandVar } from '../../styles/brand/brand-tokens';
import { DecorativeSvg } from './root';
import type { DecorativeProps, DecorativeSize } from './types';

const DIMENSIONS: Record<DecorativeSize, { readonly width: number; readonly height: number }> = {
  sm: { width: 24, height: 12 },
  md: { width: 40, height: 20 },
  lg: { width: 64, height: 32 },
};

export function DecorativeArrow({
  color = 'orange-500',
  size = 'md',
  className,
}: DecorativeProps): ReactNode {
  const dimension = DIMENSIONS[size];
  const stroke = brandVar(color);

  return (
    <DecorativeSvg
      $width={dimension.width}
      $height={dimension.height}
      viewBox="0 0 64 28"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M4 23 C18 9 38 5 59 9"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M49 2 L59 9 L49 18"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </DecorativeSvg>
  );
}
