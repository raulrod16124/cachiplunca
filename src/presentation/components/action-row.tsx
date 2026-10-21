import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import styled, { css } from 'styled-components';

const Root = styled.div<{ $align: 'start' | 'center'; $wrap: boolean }>`
  display: flex;
  align-items: ${({ $align }) => ($align === 'start' ? 'flex-start' : 'center')};
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  min-width: 0;

  ${({ $wrap }) =>
    $wrap &&
    css`
      flex-wrap: wrap;
    `}
`;

const Leading = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 0;
`;

const Content = styled.div`
  flex: 1 1 auto;
  min-width: 0;
`;

const Trailing = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 0;
`;

export interface ActionRowProps extends HTMLAttributes<HTMLElement> {
  readonly leading?: ReactNode;
  readonly trailing?: ReactNode;
  readonly align?: 'start' | 'center';
  readonly wrap?: boolean;
  readonly as?: ElementType;
  readonly children?: ReactNode;
}

export function ActionRow({
  leading,
  trailing,
  align = 'center',
  wrap = false,
  children,
  ...rest
}: ActionRowProps): ReactNode {
  return (
    <Root $align={align} $wrap={wrap} {...rest}>
      {leading === undefined ? null : <Leading>{leading}</Leading>}
      <Content>{children}</Content>
      {trailing === undefined ? null : <Trailing>{trailing}</Trailing>}
    </Root>
  );
}
