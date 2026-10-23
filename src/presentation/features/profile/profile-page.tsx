import { Heading, Stack, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import type { LogoutUser } from '../../../application/commands';
import { useI18n } from '../../i18n';
import { useSession } from '../../providers/session-provider';
import { AppShell } from '../app-shell/app-shell';
import { NotificationsButton } from '../notifications';
import { PROFILE_TAB, ProfileView, isProfileTab, type ProfileTab } from './profile-view';

const Main = styled.main`
  width: 100%;
  max-width: 960px;
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
    >
      <Main id="main-content" tabIndex={-1}>
        <Header>
          <Stack gap="space-1">
            <Heading as="h1">{t('profile.title')}</Heading>
            <Text color="color.text.muted">{t('profile.description')}</Text>
          </Stack>
        </Header>
        <ProfileView currentUser={currentUser} tab={tab} onTabChange={handleTabChange} />
      </Main>
    </AppShell>
  );
}
