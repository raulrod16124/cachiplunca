import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import styled, { css } from 'styled-components';

export type SurfaceVariant = 'surface' | 'raised' | 'sunken';
export type SurfacePadding = 'none' | 'sm' | 'md' | 'lg';

export const surfaceVariantStyles = css<{ $variant: SurfaceVariant }>`
  background: ${({ theme, $variant }) =>
    $variant === 'sunken' ? theme.color.background.sunken : theme.color.background.surface};
  border: 1px solid ${({ theme }) => theme.color.border.default};
  box-shadow: ${({ theme, $variant }) => ($variant === 'raised' ? theme.shadow.md : 'none')};
`;

export const surfacePaddingStyles = css<{ $padding: SurfacePadding }>`
  padding: ${({ theme, $padding }) => {
    if ($padding === 'none') {
      return '0';
    }
    if ($padding === 'sm') {
      return theme.space[3];
    }
    if ($padding === 'md') {
      return theme.space[4];
    }
    return theme.space[6];
  }};
`;

const Root = styled.div<{
  $variant: SurfaceVariant;
  $padding: SurfacePadding;
  $interactive: boolean;
}>`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: ${({ theme }) => theme.radius.lg};
  color: ${({ theme }) => theme.color.text.primary};

  ${surfaceVariantStyles}
  ${surfacePaddingStyles}

  ${({ $interactive, theme }) =>
    $interactive &&
    css`
      transition:
        border-color ${theme.motion.duration.fast} ease,
        box-shadow ${theme.motion.duration.fast} ease,
        transform ${theme.motion.duration.fast} ease;

      &:hover {
        border-color: var(--cach-border-accent);
        box-shadow: ${theme.shadow.sm};
        transform: translateY(-1px);
      }

      @media (prefers-reduced-motion: reduce) {
        transition: none;
        transform: none;
      }
    `}
`;

export interface CardProps extends HTMLAttributes<HTMLElement> {
  readonly variant?: SurfaceVariant;
  readonly padding?: SurfacePadding;
  readonly interactive?: boolean;
  readonly as?: ElementType;
}

export function Card({
  variant = 'surface',
  padding = 'md',
  interactive = false,
  ...rest
}: CardProps): ReactNode {
  return <Root $variant={variant} $padding={padding} $interactive={interactive} {...rest} />;
}
