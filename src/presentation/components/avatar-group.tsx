import { Avatar, Tooltip } from '@raulrod/ui';
import type { AvatarSize } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { brandVar } from '../styles/brand/brand-tokens';

export interface AvatarGroupItem {
  readonly id: string;
  readonly name: string;
  readonly color?: string;
  readonly testId?: string;
  readonly description?: string;
}

interface RingProps {
  readonly $ringColor?: string;
}

const Root = styled.span`
  display: inline-flex;
  align-items: center;
  min-width: 0;
`;

const ItemSlot = styled(Tooltip)<RingProps>`
  display: inline-flex;
  border-radius: ${({ theme }) => theme.radius.full};
  box-shadow: 0 0 0 2px ${({ $ringColor, theme }) => $ringColor ?? theme.color.background.default};

  &:not(:first-child) {
    margin-left: calc(-1 * ${({ theme }) => theme.space[2]});
  }
`;

const OverflowSlot = styled(Tooltip)<RingProps>`
  display: inline-flex;
  border-radius: ${({ theme }) => theme.radius.full};
  box-shadow: 0 0 0 2px ${({ $ringColor, theme }) => $ringColor ?? theme.color.background.default};
  margin-left: calc(-1 * ${({ theme }) => theme.space[2]});
`;

const Overflow = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: ${({ theme }) => theme.space[8]};
  height: ${({ theme }) => theme.space[8]};
  padding: 0 ${({ theme }) => theme.space[1]};
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.color.background.sunken};
  color: ${({ theme }) => theme.color.text.muted};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
`;

export interface AvatarGroupProps {
  readonly items: readonly AvatarGroupItem[];
  readonly max?: number;
  readonly size?: AvatarSize;
  readonly decorative?: boolean;
  readonly label?: string;
  readonly ringColor?: string;
  readonly textColor?: string;
  readonly className?: string;
}

export function AvatarGroup({
  items,
  max = 4,
  size = 'sm',
  decorative = false,
  label,
  ringColor,
  textColor = brandVar('cream-0'),
  className,
}: AvatarGroupProps): ReactNode {
  if (items.length === 0) {
    return null;
  }

  const visible = items.slice(0, max);
  const overflow = items.slice(max);
  return (
    <Root
      className={className}
      role={decorative || label === undefined ? undefined : 'group'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
    >
      {visible.map((item) => (
        <ItemSlot
          key={item.id}
          content={item.description ?? item.name}
          placement="bottom"
          $ringColor={ringColor}
        >
          <Avatar
            name={item.name}
            size={size}
            data-testid={item.testId}
            data-user-color={item.color}
            styles={
              item.color === undefined
                ? undefined
                : { backgroundColor: item.color, color: textColor }
            }
          />
        </ItemSlot>
      ))}
      {overflow.length === 0 ? null : (
        <OverflowSlot
          content={overflow.map((item) => item.description ?? item.name).join(', ')}
          placement="bottom"
          $ringColor={ringColor}
        >
          <Overflow
            aria-hidden={decorative ? true : undefined}
            aria-label={
              decorative
                ? undefined
                : label === undefined
                  ? undefined
                  : `${label}: +${overflow.length}`
            }
          >
            +{overflow.length}
          </Overflow>
        </OverflowSlot>
      )}
    </Root>
  );
}
