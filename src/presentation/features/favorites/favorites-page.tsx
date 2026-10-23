import { Heading, Text } from '@raulrod/ui';
import { Star } from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import type { LogoutUser } from '../../../application/commands';
import type { ListWorkspaces } from '../../../application/queries';
import { useI18n } from '../../i18n';
import { useSession } from '../../providers/session-provider';
import { DecorativeSpark } from '../../components/decorative';
import { AppShell } from '../app-shell/app-shell';
import { NotificationsButton } from '../notifications';
import { WorkspacesListContainer } from '../workspaces/components/workspaces-list-container';

const Main = styled.main`
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.space[8]} ${theme.space[6]}`};

  @media (max-width: 900px) {
    padding: ${({ theme }) => `${theme.space[5]} ${theme.space[4]}`};
  }
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  margin-bottom: ${({ theme }) => theme.space[6]};
`;

const HeaderTitle = styled.div`
  position: relative;
  display: inline-flex;

  &::after {
    content: '';
    position: absolute;
    bottom: calc(-1 * ${({ theme }) => theme.space[1]});
    left: 0;
    width: min(88px, 70%);
    height: 3px;
    border-radius: var(--rr-radius-full);
    background: var(--cach-header-accent);
  }
`;

const PageTitle = styled(Heading)`
  font-size: ${({ theme }) => theme.font.size['2xl']};
`;

const TitleRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
`;

export interface FavoritesPageProps {
  readonly logoutUser: LogoutUser;
  readonly listWorkspaces: ListWorkspaces;
}

export function FavoritesPage({ logoutUser, listWorkspaces }: FavoritesPageProps): ReactNode {
  const session = useSession();
  const navigate = useNavigate();
  const { t } = useI18n();
  const currentUser = session.status === 'authenticated' ? session.user : null;

  if (currentUser === null) {
    return null;
  }

  return (
    <AppShell
      currentUser={currentUser}
      logoutUser={logoutUser}
      notifications={<NotificationsButton />}
    >
      <Main id="main-content" tabIndex={-1}>
        <Header>
          <TitleRow>
            <Star aria-hidden="true" size={20} />
            <HeaderTitle>
              <PageTitle as="h1">{t('favorites.title')}</PageTitle>
            </HeaderTitle>
          </TitleRow>
          <Text color="color.text.muted">{t('favorites.description')}</Text>
        </Header>

        <WorkspacesListContainer
          userId={currentUser.uid}
          listWorkspaces={listWorkspaces}
          onCreateWorkspace={() => navigate('/workspaces')}
          favoritesOnly
          loadingLabel={t('favorites.loading')}
          emptyState={{
            title: t('favorites.empty.title'),
            description: t('favorites.empty.description'),
            actionLabel: t('favorites.empty.action'),
            onAction: () => navigate('/workspaces'),
            illustration: <DecorativeSpark color="mustard-500" size="lg" />,
          }}
        />
      </Main>
    </AppShell>
  );
}
