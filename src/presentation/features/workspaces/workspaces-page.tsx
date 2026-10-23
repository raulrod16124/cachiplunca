import { useMemo, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../providers/session-provider';
import type {
  CreateWorkspace,
  CreateWorkspaceInput,
  CreateWorkspaceResult,
  CreateWorkspaceWithOwner,
  DeleteWorkspace,
  DuplicateWorkspace,
  LogoutUser,
  UpdateWorkspace,
} from '../../../application/commands';
import type { ImageServices } from '../../../application/image-services';
import type { ListWorkspaces } from '../../../application/queries';
import { UserId } from '../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../shared/errors';
import { useI18n } from '../../i18n';
import { AppShell } from '../app-shell/app-shell';
import { NotificationsButton } from '../notifications';
import { CreateWorkspaceDialog } from './components/create-workspace-dialog';
import { WorkspacesCommandPalette } from './components/workspaces-command-palette';
import { WorkspacesListContainer } from './components/workspaces-list-container';
import {
  BoardsContainer,
  BoardsFooter,
  BoardsHeader,
  BoardsMain,
  BoardsTitle,
  BoardsTitleGroup,
  CreateBoardCta,
  DotGrid,
} from './components/boards-page-shell';

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};
`;

export interface WorkspacesPageProps {
  readonly logoutUser: LogoutUser;
  readonly listWorkspaces: ListWorkspaces;
  readonly createWorkspaceWithOwner: CreateWorkspaceWithOwner;
  readonly deleteWorkspace?: DeleteWorkspace;
  readonly duplicateWorkspace?: DuplicateWorkspace;
  readonly updateWorkspace?: UpdateWorkspace;
  readonly imageServices?: ImageServices;
}

export function WorkspacesPage({
  logoutUser,
  listWorkspaces,
  createWorkspaceWithOwner,
  deleteWorkspace,
  duplicateWorkspace,
  updateWorkspace,
  imageServices,
}: WorkspacesPageProps): ReactNode {
  const session = useSession();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const currentUser = session.status === 'authenticated' ? session.user : null;
  const ownerId =
    session.status === 'authenticated'
      ? UserId.create(session.user.uid)
      : UserId.create('anonymous');

  const createWorkspace: CreateWorkspace = useMemo(() => {
    if (session.status !== 'authenticated') {
      return async (): Promise<CreateWorkspaceResult> => ({
        status: 'error',
        error: createAppError(
          'authorization',
          ERROR_CODES.AUTH_UNAUTHENTICATED,
          'Your session has expired. Sign in again to continue.',
        ),
      });
    }

    return (input: CreateWorkspaceInput) => createWorkspaceWithOwner({ ...input, ownerId });
  }, [createWorkspaceWithOwner, session, ownerId]);

  const handleCreateWorkspace = () => {
    setCreateOpen(true);
  };

  const handleCreated = () => {
    setRefreshToken((token) => token + 1);
  };

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
              <BoardsTitle as="h1">{t('workspaces.title')}</BoardsTitle>
            </BoardsTitleGroup>
            <CreateBoardCta label={t('workspaces.create')} onClick={handleCreateWorkspace} />
          </BoardsHeader>

          <Section id="workspaces">
            {session.status === 'authenticated' && (
              <WorkspacesListContainer
                userId={session.user.uid}
                listWorkspaces={listWorkspaces}
                deleteWorkspace={deleteWorkspace}
                duplicateWorkspace={duplicateWorkspace}
                updateWorkspace={updateWorkspace}
                imageServices={imageServices}
                onCreateWorkspace={handleCreateWorkspace}
                onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                surface="stitch"
                refreshToken={refreshToken}
              />
            )}
          </Section>

          <BoardsFooter>
            <span>{t('app.copyright')}</span>
          </BoardsFooter>
        </BoardsContainer>
      </BoardsMain>
      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        createWorkspace={createWorkspace}
        createdBy={ownerId}
        onCreated={handleCreated}
        imageServices={imageServices}
        updateWorkspace={updateWorkspace}
        surface="stitch"
      />
      <WorkspacesCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        userId={session.status === 'authenticated' ? session.user.uid : undefined}
        listWorkspaces={listWorkspaces}
        onCreateWorkspace={handleCreateWorkspace}
        onOpenWorkspace={(workspace) => navigate(`/workspaces/${workspace.id.value}`)}
        surface="stitch"
      />
    </AppShell>
  );
}
