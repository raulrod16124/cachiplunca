import { LayoutGrid } from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled, { css } from 'styled-components';

export const workspaceCoverBackground = css`
  background:
    radial-gradient(
      circle at 20% 20%,
      ${({ theme }) => theme.color.background.surface},
      transparent 55%
    ),
    linear-gradient(
      135deg,
      ${({ theme }) => theme.color.background.sunken},
      ${({ theme }) => theme.canvas.surfaceMuted}
    );
`;

const Frame = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: ${({ theme }) => theme.color.text.muted};

  ${workspaceCoverBackground}
`;

const Cover = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export interface WorkspaceCoverProps {
  readonly url: string | null;
  readonly alt?: string;
  readonly loading?: 'lazy' | 'eager';
  readonly iconSize?: number;
  readonly className?: string;
}

export function WorkspaceCover({
  url,
  alt = '',
  loading = 'lazy',
  iconSize = 18,
  className,
}: WorkspaceCoverProps): ReactNode {
  return (
    <Frame className={className} aria-hidden={url === null ? 'true' : undefined}>
      {url === null ? (
        <LayoutGrid aria-hidden="true" size={iconSize} />
      ) : (
        <Cover src={url} alt={alt} loading={loading} />
      )}
    </Frame>
  );
}
