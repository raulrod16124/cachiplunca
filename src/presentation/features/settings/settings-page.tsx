import type { ReactNode } from 'react';
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
import { SettingsControls } from './settings-controls';

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
      variant="stitch"
    >
      <BoardsMain id="main-content" tabIndex={-1}>
        <DotGrid />
        <BoardsContainer>
          <BoardsHeader>
            <BoardsTitleGroup>
              <BoardsTitle as="h1">{t('settings.title')}</BoardsTitle>
              <BoardsSubtitle>{t('settings.description')}</BoardsSubtitle>
            </BoardsTitleGroup>
          </BoardsHeader>

          <SettingsControls />

          <BoardsFooter>
            <span>{t('app.copyright')}</span>
          </BoardsFooter>
        </BoardsContainer>
      </BoardsMain>
    </AppShell>
  );
}
