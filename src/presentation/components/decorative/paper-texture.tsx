import type { ReactNode } from 'react';
import styled from 'styled-components';

const Root = styled.span`
  position: absolute;
  inset: 0;
  display: block;
  overflow: hidden;
  pointer-events: none;
  border-radius: inherit;
  opacity: 0.55;
`;

export interface PaperTextureProps {
  readonly className?: string;
}

/**
 * Subtle paper grain for large branded surfaces (auth panel, canvas, empty
 * states). Render it inside a positioned surface; it never intercepts pointer
 * events and is ignored by assistive technology.
 */
export function PaperTexture({ className }: PaperTextureProps): ReactNode {
  const classes = className ? `cach-paper-texture ${className}` : 'cach-paper-texture';

  return <Root aria-hidden="true" className={classes} />;
}
