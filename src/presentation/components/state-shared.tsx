import { Heading } from '@raulrod/ui';
import type { HeadingProps } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled, { css, useTheme } from 'styled-components';

export type StateTone = 'neutral' | 'brand' | 'danger';
export type StateTitleVariant = 'default' | 'display';

const toneStyles = css<{ $tone: StateTone }>`
  ${({ theme, $tone }) => {
    if ($tone === 'brand') {
      return css`
        background: ${theme.color.background.sunken};
        border-color: ${theme.color.border.strong};
        color: ${theme.color.action.secondary.background};
      `;
    }

    if ($tone === 'danger') {
      return css`
        background: ${theme.color.background.destructive};
        border-color: ${theme.color.border.danger};
        color: ${theme.color.text.destructive};
      `;
    }

    return css`
      background: ${theme.color.background.sunken};
      border-color: ${theme.color.border.default};
      color: ${theme.color.text.muted};
    `;
  }}
`;

export const StateIllustration = styled.div<{ $tone: StateTone }>`
  box-sizing: border-box;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: ${({ theme }) => theme.space[16]};
  height: ${({ theme }) => theme.space[16]};
  max-width: 100%;
  padding: ${({ theme }) => theme.space[2]};
  border: 1px solid;
  border-radius: ${({ theme }) => theme.radius.lg};
  pointer-events: none;

  ${toneStyles}

  & > svg {
    display: block;
    max-width: 100%;
    max-height: 100%;
  }
`;

export interface StateTitleProps extends HeadingProps {
  readonly titleVariant?: StateTitleVariant;
}

export function StateTitle({
  titleVariant = 'default',
  style,
  ...rest
}: StateTitleProps): ReactNode {
  const theme = useTheme();
  const displayStyle =
    titleVariant === 'display'
      ? {
          fontFamily: theme.font.family.display,
          fontWeight: theme.font.weight.regular,
          lineHeight: theme.font.leading.tight,
        }
      : undefined;

  return <Heading {...rest} style={displayStyle ? { ...style, ...displayStyle } : style} />;
}
