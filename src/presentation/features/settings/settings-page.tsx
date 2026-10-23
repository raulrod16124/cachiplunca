import { Heading, Stack, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { LogoutUser } from '../../../application/commands';
import { useI18n } from '../../i18n';
import { useSession } from '../../providers/session-provider';
import { AppShell } from '../app-shell/app-shell';
import { NotificationsButton } from '../notifications';
import { SettingsControls } from './settings-controls';

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

export interface SettingsPageProps {
  readonly logoutUser: LogoutUser;
}

export function SettingsPage({ logoutUser }: SettingsPageProps): ReactNode {
  const session = useSession();
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
          <Stack gap="space-1">
            <Heading as="h1">{t('settings.title')}</Heading>
            <Text color="color.text.muted">{t('settings.description')}</Text>
          </Stack>
        </Header>
        <SettingsControls />
      </Main>
    </AppShell>
  );
}
