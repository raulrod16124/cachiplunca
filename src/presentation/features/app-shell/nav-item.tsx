import type { AnchorHTMLAttributes, ReactNode } from 'react';
import styled from 'styled-components';

const Root = styled.a<{ $active: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme, $active }) => ($active ? theme.color.text.primary : theme.color.text.muted)};
  background: ${({ theme, $active }) => ($active ? theme.color.background.sunken : 'transparent')};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme, $active }) =>
    $active ? theme.font.weight.semibold : theme.font.weight.regular};
  text-decoration: none;
  transition:
    background ${({ theme }) => theme.motion.duration.fast} ease,
    color ${({ theme }) => theme.motion.duration.fast} ease;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    width: 3px;
    height: 1.4em;
    border-radius: ${({ theme }) => theme.radius.full};
    background: ${({ theme, $active }) =>
      $active ? theme.color.action.primary.background : 'transparent'};
    transform: translateY(-50%);
  }

  &:hover {
    background: ${({ theme }) => theme.color.background.sunken};
    color: ${({ theme }) => theme.color.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
`;

const BadgeSlot = styled.span`
  display: inline-flex;
  margin-left: auto;
`;

export interface NavItemProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> {
  readonly icon?: ReactNode;
  readonly children: ReactNode;
  readonly active?: boolean;
  readonly badge?: ReactNode;
}

export function NavItem({
  icon,
  children,
  active = false,
  badge,
  ...rest
}: NavItemProps): ReactNode {
  return (
    <Root {...rest} $active={active} aria-current={active ? 'page' : undefined}>
      {icon}
      {children}
      {badge === undefined ? null : <BadgeSlot>{badge}</BadgeSlot>}
    </Root>
  );
}
