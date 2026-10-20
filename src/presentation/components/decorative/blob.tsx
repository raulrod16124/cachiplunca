import type { ReactNode } from 'react';
import { brandVar } from '../../styles/brand/brand-tokens';
import { DecorativeSvg } from './root';
import type { DecorativeProps, DecorativeSize } from './types';

const DIMENSIONS: Record<DecorativeSize, { readonly width: number; readonly height: number }> = {
  sm: { width: 48, height: 32 },
  md: { width: 72, height: 48 },
  lg: { width: 96, height: 64 },
};

export function DecorativeBlob({
  color = 'olive-500',
  size = 'md',
  className,
}: DecorativeProps): ReactNode {
  const dimension = DIMENSIONS[size];

  return (
    <DecorativeSvg
      $width={dimension.width}
      $height={dimension.height}
      viewBox="0 0 96 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M48 5 C69 -2 91 10 92 29 C93 49 72 61 47 60 C23 59 5 49 4 29 C3 11 27 12 48 5 Z"
        fill={brandVar(color)}
      />
    </DecorativeSvg>
  );
}
