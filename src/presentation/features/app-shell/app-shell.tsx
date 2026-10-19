import { Button, Text } from '@raulrod/ui';
import { LayoutGrid, Mail, Plus } from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { LogoutUser } from '../../../application/commands';
import type { AuthUser } from '../../../application/ports';
import { useI18n } from '../../i18n';
import { AccountMenu } from '../auth/account-menu';

const Layout = styled.div`
  display: flex;
  min-height: 100dvh;
  background: ${({ theme }) => theme.color.background.default};
`;

const Sidebar = styled.aside`
  display: flex;
  flex: none;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[6]};
  width: 264px;
  height: 100dvh;
  padding: ${({ theme }) => theme.space[5]};
  border-right: 1px solid ${({ theme }) => theme.color.border.default};
  background: ${({ theme }) => theme.color.background.surface};
  position: sticky;
  top: 0;

  @media (max-width: 900px) {
    width: 100%;
    height: auto;
    position: static;
    padding: ${({ theme }) => `${theme.space[3]} ${theme.space[4]}`};
    border-right: none;
    border-bottom: 1px solid ${({ theme }) => theme.color.border.default};
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

const BrandMark = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: ${({ theme }) => theme.space[8]};
  height: ${({ theme }) => theme.space[8]};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.action.primary.background};
  color: ${({ theme }) => theme.color.action.primary.text};
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.bold};
`;

const BrandName = styled.span`
  overflow: hidden;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: ${({ theme }) => theme.font.tracking.tight};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};

  @media (max-width: 900px) {
    display: none;
  }
`;

const NavItem = styled.a<{ $active?: boolean }>`
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

  &:hover {
    background: ${({ theme }) => theme.color.background.sunken};
    color: ${({ theme }) => theme.color.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
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

const CreateButton = styled(Button)`
  width: 100%;

  @media (max-width: 900px) {
    width: auto;
  }
`;

export interface AppShellProps {
  readonly currentUser: AuthUser | null;
  readonly logoutUser: LogoutUser;
  readonly onCreateWorkspace: () => void;
  readonly children: ReactNode;
}

export function AppShell({
  currentUser,
  logoutUser,
  onCreateWorkspace,
  children,
}: AppShellProps): ReactNode {
  const { t } = useI18n();
  const name = currentUser?.displayName ?? t('shell.account.identity');

  return (
    <Layout>
      <Sidebar>
        <BrandRow>
          <Brand>
            <BrandMark aria-hidden="true">C</BrandMark>
            <BrandName>{t('brand.name')}</BrandName>
          </Brand>
        </BrandRow>

        <CreateButton type="button" variant="primary" onClick={onCreateWorkspace}>
          <Plus aria-hidden="true" size={16} />
          {t('shell.newWorkspace')}
        </CreateButton>

        <Nav>
          <NavItem href="#workspaces" $active>
            <LayoutGrid aria-hidden="true" size={16} />
            {t('shell.nav.workspaces')}
          </NavItem>
          <NavItem href="#pending-invitations">
            <Mail aria-hidden="true" size={16} />
            {t('shell.nav.invitations')}
          </NavItem>
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
