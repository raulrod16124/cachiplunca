import { Button } from '@raulrod/ui';
import styled from 'styled-components';
import type { ReactNode, ButtonHTMLAttributes } from 'react';

const StyledToolbarButton = styled(Button)`
  min-width: 32px;
  padding-left: ${({ theme }) => theme.space[1]};
  padding-right: ${({ theme }) => theme.space[1]};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

export interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

export function ToolbarButton({
  active = false,
  children,
  ...rest
}: ToolbarButtonProps): ReactNode {
  return (
    <StyledToolbarButton type="button" variant={active ? 'primary' : 'outline'} {...rest}>
      {children}
    </StyledToolbarButton>
  );
}
