import { Text } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled, { css } from 'styled-components';
import type { LogoutUser } from '../../../application/commands';
import type { AuthUser } from '../../../application/ports';
import { useI18n } from '../../i18n';
import { BrandLogo } from '../../components';
import { AccountMenu } from '../auth/account-menu';
import { NavLinks } from './nav-links';
import { NarrowNavMenu } from './narrow-nav-menu';

export type AppShellVariant = 'brand' | 'stitch';

const Layout = styled.div<{ $variant: AppShellVariant }>`
  display: flex;
  min-height: 100dvh;
  background: ${({ theme, $variant }) =>
    $variant === 'stitch' ? 'var(--stitch-bg)' : theme.color.background.page};
  background-image: ${({ $variant }) =>
    $variant === 'stitch' ? 'none' : 'var(--cach-surface-page-pattern)'};
  background-size: var(--cach-surface-page-pattern-size);

  @media (max-width: 900px) {
    flex-direction: column;
  }
`;

const Sidebar = styled.aside<{ $variant: AppShellVariant }>`
  position: sticky;
  top: 0;
  display: flex;
  flex: none;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[6]};
  width: 264px;
  height: 100dvh;
  padding: ${({ theme }) => theme.space[5]};
  border-right: 1px solid var(--cach-shell-border);
  background: var(--cach-surface-sidebar);
  background-image: var(--cach-surface-sidebar-pattern);
  background-size: var(--cach-surface-sidebar-pattern-size);

  ${({ $variant }) =>
    $variant === 'stitch' &&
    css`
      gap: 0;
      width: 256px;
      padding: 0;
      border-right: 1px solid var(--stitch-sidebar-border);
      background: var(--stitch-sidebar);
      background-image: none;
      box-shadow: var(--stitch-sidebar-shadow);
      color: var(--stitch-text);
    `}

  @media (max-width: 900px) {
    width: 100%;
    height: auto;
    position: relative;
    padding: ${({ theme }) => `${theme.space[3]} ${theme.space[4]}`};
    border-right: none;
    border-bottom: 1px solid var(--cach-shell-border);
    gap: ${({ theme }) => theme.space[3]};

    ${({ $variant }) =>
      $variant === 'stitch' &&
      css`
        padding: ${({ theme }) => `${theme.space[3]} ${theme.space[4]}`};
        border-bottom: 1px solid var(--stitch-sidebar-border);
      `}
  }
`;

const BrandRow = styled.div<{ $variant: AppShellVariant }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]};

  ${({ $variant }) =>
    $variant === 'stitch' &&
    css`
      padding: ${({ theme }) => `${theme.space[6]} ${theme.space[6]} ${theme.space[5]}`};
      border-bottom: 1px solid var(--stitch-sidebar-border);

      @media (max-width: 900px) {
        padding: 0;
        border-bottom: none;
      }
    `}
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 0;
`;

const BrandActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
`;

const Nav = styled.nav<{ $variant: AppShellVariant }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};

  ${({ $variant }) =>
    $variant === 'stitch' &&
    css`
      flex: 1 1 auto;
      min-height: 0;
      gap: ${({ theme }) => theme.space[2]};
      padding: ${({ theme }) => `${theme.space[4]} ${theme.space[3]}`};
      overflow-y: auto;
    `}

  @media (max-width: 900px) {
    display: none;
  }
`;

const NavSectionLabel = styled.h2`
  margin: 0;
  padding: 0 ${({ theme }) => theme.space[3]};
  color: var(--stitch-text-subtle);
  font-family: var(--stitch-font-body);
  font-size: 11px;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const SidebarFooter = styled.div<{ $variant: AppShellVariant }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  margin-top: auto;
  padding-top: ${({ theme }) => theme.space[4]};
  border-top: 1px solid ${({ theme }) => theme.color.border.default};

  ${({ $variant }) =>
    $variant === 'stitch' &&
    css`
      width: 100%;
      padding: ${({ theme }) => theme.space[3]};
      border-top: 1px solid var(--stitch-sidebar-border);
    `}

  @media (max-width: 900px) {
    margin-top: 0;
    padding-top: 0;
    border-top: none;

    ${({ $variant }) =>
      $variant === 'stitch' &&
      css`
        display: none;
      `}
  }
`;

const Identity = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  & > * {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Content = styled.div`
  flex: 1 1 auto;
  min-width: 0;
`;

export interface AppShellProps {
  readonly currentUser: AuthUser | null;
  readonly logoutUser: LogoutUser;
  readonly notifications?: ReactNode;
  readonly variant?: AppShellVariant;
  readonly children: ReactNode;
}

export function AppShell({
  currentUser,
  logoutUser,
  notifications,
  variant = 'brand',
  children,
}: AppShellProps): ReactNode {
  const { t } = useI18n();
  const name = currentUser?.displayName ?? t('shell.account.identity');

  return (
    <Layout $variant={variant} {...(variant === 'stitch' ? { 'data-surface': 'stitch' } : {})}>
      <Sidebar $variant={variant}>
        <BrandRow $variant={variant}>
          <Brand>
            <BrandLogo variant="wordmark" responsive size="md" />
          </Brand>
          <BrandActions>
            {notifications}
            <NarrowNavMenu currentUser={currentUser} logoutUser={logoutUser} variant={variant} />
          </BrandActions>
        </BrandRow>

        <Nav id="app-nav" aria-label={t('shell.nav.label')} $variant={variant}>
          {variant === 'stitch' ? (
            <NavSectionLabel>{t('shell.nav.section')}</NavSectionLabel>
          ) : null}
          <NavLinks />
        </Nav>

        <SidebarFooter $variant={variant}>
          <AccountMenu
            currentUser={currentUser}
            logoutUser={logoutUser}
            variant={variant === 'stitch' ? 'profile' : 'compact'}
          />
          {variant === 'brand' ? (
            <Identity>
              <Text weight="font.weight.medium" size="font.size.sm">
                {name}
              </Text>
            </Identity>
          ) : null}
        </SidebarFooter>
      </Sidebar>
      <Content>{children}</Content>
    </Layout>
  );
}
