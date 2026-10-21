import type { IconButtonProps } from '@raulrod/ui';
import type { ReactElement, ReactNode } from 'react';
import { NeutralIconButton } from './neutral-controls';

export interface ToolbarButtonProps extends Omit<IconButtonProps, 'variant'> {
  readonly active?: boolean;
  readonly children: ReactNode;
}

export function ToolbarButton({
  active = false,
  size = 'md',
  label,
  children,
  ...rest
}: ToolbarButtonProps): ReactElement {
  return (
    <NeutralIconButton
      type="button"
      variant={active ? 'primary' : 'ghost'}
      size={size}
      label={label}
      {...rest}
    >
      {children}
    </NeutralIconButton>
  );
}
