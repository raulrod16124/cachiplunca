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
import {
  BoardsContainer,
  BoardsFooter,
  BoardsHeader,
  BoardsMain,
  BoardsSubtitle,
  BoardsTitle,
  BoardsTitleGroup,
  DotGrid,
} from '../../components/stitch-page-shell';

const TitleRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  color: var(--stitch-secondary);
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
      variant="stitch"
    >
      <BoardsMain id="main-content" tabIndex={-1}>
        <DotGrid />
        <BoardsContainer>
          <BoardsHeader>
            <BoardsTitleGroup>
              <TitleRow>
                <Star aria-hidden="true" size={20} />
                <BoardsTitle as="h1">{t('favorites.title')}</BoardsTitle>
              </TitleRow>
              <BoardsSubtitle>{t('favorites.description')}</BoardsSubtitle>
            </BoardsTitleGroup>
          </BoardsHeader>

          <WorkspacesListContainer
            userId={currentUser.uid}
            listWorkspaces={listWorkspaces}
            onCreateWorkspace={() => navigate('/workspaces')}
            favoritesOnly
            surface="stitch"
            loadingLabel={t('favorites.loading')}
            emptyState={{
              title: t('favorites.empty.title'),
              description: t('favorites.empty.description'),
              actionLabel: t('favorites.empty.action'),
              onAction: () => navigate('/workspaces'),
              illustration: <DecorativeSpark color="mustard-500" size="lg" />,
            }}
          />

          <BoardsFooter>
            <span>{t('app.copyright')}</span>
          </BoardsFooter>
        </BoardsContainer>
      </BoardsMain>
    </AppShell>
  );
}
