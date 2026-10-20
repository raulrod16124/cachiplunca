import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import styled from 'styled-components';
import { surfacePaddingStyles, surfaceVariantStyles } from './card';
import type { SurfacePadding, SurfaceVariant } from './card';

const Root = styled.section<{ $variant: SurfaceVariant; $padding: SurfacePadding }>`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 0;
  border-radius: ${({ theme }) => theme.radius.lg};
  color: ${({ theme }) => theme.color.text.primary};

  ${surfaceVariantStyles}
  ${surfacePaddingStyles}

  @media (max-width: 700px) {
    width: 100%;
  }
`;

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  readonly variant?: SurfaceVariant;
  readonly padding?: SurfacePadding;
  readonly as?: ElementType;
}

export function Panel({ variant = 'surface', padding = 'md', ...rest }: PanelProps): ReactNode {
  return <Root $variant={variant} $padding={padding} {...rest} />;
}
