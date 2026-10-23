import type { ReactNode } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import type { LogoutUser } from '../../../application/commands';
import { useI18n } from '../../i18n';
import { useSession } from '../../providers/session-provider';
import { AppShell } from '../app-shell/app-shell';
import { NotificationsButton } from '../notifications';
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
import { PROFILE_TAB, ProfileView, isProfileTab, type ProfileTab } from './profile-view';

const LEGACY_PREFERENCES_TAB = 'preferences';

export interface ProfilePageProps {
  readonly logoutUser: LogoutUser;
}

export function ProfilePage({ logoutUser }: ProfilePageProps): ReactNode {
  const session = useSession();
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const tab: ProfileTab = isProfileTab(tabParam) ? tabParam : PROFILE_TAB;
  const currentUser = session.status === 'authenticated' ? session.user : null;

  if (tabParam === LEGACY_PREFERENCES_TAB) {
    return <Navigate to="/settings" replace />;
  }

  const handleTabChange = (nextTab: ProfileTab): void => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === PROFILE_TAB) {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', nextTab);
    }
    setSearchParams(nextParams, { replace: true });
  };

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
              <BoardsTitle as="h1">{t('profile.title')}</BoardsTitle>
              <BoardsSubtitle>{t('profile.description')}</BoardsSubtitle>
            </BoardsTitleGroup>
          </BoardsHeader>

          <ProfileView currentUser={currentUser} tab={tab} onTabChange={handleTabChange} />

          <BoardsFooter>
            <span>{t('app.copyright')}</span>
          </BoardsFooter>
        </BoardsContainer>
      </BoardsMain>
    </AppShell>
  );
}
