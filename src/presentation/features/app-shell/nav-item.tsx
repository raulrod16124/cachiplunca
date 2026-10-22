import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';

const itemStyles = css<{ $active: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme, $active }) =>
    $active ? 'var(--cach-nav-active-text)' : theme.color.text.muted};
  background: ${({ $active }) => ($active ? 'var(--cach-surface-nav-active)' : 'transparent')};
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
    background: ${({ $active }) => ($active ? 'var(--cach-nav-accent)' : 'transparent')};
    transform: translateY(-50%);
  }

  &:hover {
    background: ${({ $active }) =>
      $active ? 'var(--cach-surface-nav-active)' : 'var(--cach-control-hover)'};
    color: ${({ theme, $active }) =>
      $active ? 'var(--cach-nav-active-text)' : theme.color.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
`;

const AnchorRoot = styled.a<{ $active: boolean }>`
  ${itemStyles}
`;

const RouterRoot = styled(Link)<{ $active: boolean }>`
  ${itemStyles}
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
  readonly to?: string;
}

export function NavItem({
  icon,
  children,
  active = false,
  badge,
  to,
  ...rest
}: NavItemProps): ReactNode {
  const content = (
    <>
      {icon}
      {children}
      {badge === undefined ? null : <BadgeSlot>{badge}</BadgeSlot>}
    </>
  );
  const ariaCurrent = active ? 'page' : undefined;

  if (to !== undefined) {
    return (
      <RouterRoot {...rest} to={to} $active={active} aria-current={ariaCurrent}>
        {content}
      </RouterRoot>
    );
  }

  return (
    <AnchorRoot {...rest} $active={active} aria-current={ariaCurrent}>
      {content}
    </AnchorRoot>
  );
}
