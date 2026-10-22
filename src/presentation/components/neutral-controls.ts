import { Button, IconButton } from '@raulrod/ui';
import styled, { css } from 'styled-components';

const neutralGhost = css`
  &:not(:disabled) {
    border-color: transparent;
  }

  &:hover:not(:disabled) {
    background: var(--cach-control-hover);
  }

  &:active:not(:disabled) {
    background: var(--cach-control-active);
  }

  &:disabled {
    background: transparent;
    border-color: transparent;
    color: ${({ theme }) => theme.color.action.disabled.text};
    opacity: 0.55;
  }
`;

export const NeutralIconButton = styled(IconButton)`
  &.rr-icon-button--ghost {
    ${neutralGhost}
  }
`;

export const NeutralButton = styled(Button)`
  &.rr-button--ghost {
    ${neutralGhost}
  }
`;
