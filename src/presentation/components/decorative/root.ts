import styled from 'styled-components';

/** Shared frame for decorative SVG artwork: inert, fixed-size and overflow-safe. */
export const DecorativeSvg = styled.svg<{ $width: number; $height: number }>`
  display: block;
  flex: none;
  overflow: visible;
  pointer-events: none;
  width: ${({ $width }) => `${$width}px`};
  height: ${({ $height }) => `${$height}px`};
`;
