import { Text } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { LogoutUser } from '../../../application/commands';
import type { AuthUser } from '../../../application/ports';
import { useI18n } from '../../i18n';
import { BrandLogo } from '../../components';
import { AccountMenu } from '../auth/account-menu';
import { NavLinks } from './nav-links';
import { NarrowNavMenu } from './narrow-nav-menu';

const Layout = styled.div`
  display: flex;
  min-height: 100dvh;
  background: ${({ theme }) => theme.color.background.page};
  background-image: var(--cach-surface-page-pattern);
  background-size: var(--cach-surface-page-pattern-size);

  @media (max-width: 900px) {
    flex-direction: column;
  }
`;

const Sidebar = styled.aside`
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

  @media (max-width: 900px) {
    width: 100%;
    height: auto;
    position: relative;
    padding: ${({ theme }) => `${theme.space[3]} ${theme.space[4]}`};
    border-right: none;
    border-bottom: 1px solid var(--cach-shell-border);
    gap: ${({ theme }) => theme.space[3]};
  }
`;

const BrandRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]};
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

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};

  @media (max-width: 900px) {
    display: none;
  }
`;

const SidebarFooter = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  margin-top: auto;
  padding-top: ${({ theme }) => theme.space[4]};
  border-top: 1px solid ${({ theme }) => theme.color.border.default};

  @media (max-width: 900px) {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
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
  readonly children: ReactNode;
}

export function AppShell({
  currentUser,
  logoutUser,
  notifications,
  children,
}: AppShellProps): ReactNode {
  const { t } = useI18n();
  const name = currentUser?.displayName ?? t('shell.account.identity');

  return (
    <Layout>
      <Sidebar>
        <BrandRow>
          <Brand>
            <BrandLogo variant="wordmark" responsive size="md" />
          </Brand>
          <BrandActions>
            {notifications}
            <NarrowNavMenu currentUser={currentUser} logoutUser={logoutUser} />
          </BrandActions>
        </BrandRow>

        <Nav id="app-nav" aria-label={t('shell.nav.label')}>
          <NavLinks />
        </Nav>

        <SidebarFooter>
          <AccountMenu currentUser={currentUser} logoutUser={logoutUser} />
          <Identity>
            <Text weight="font.weight.medium" size="font.size.sm">
              {name}
            </Text>
          </Identity>
        </SidebarFooter>
      </Sidebar>
      <Content>{children}</Content>
    </Layout>
  );
}
