import { Button, Heading, Stack } from '@raulrod/ui';
import { Plus } from '@raulrod/icons';
import { useMemo, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../providers/session-provider';
import type {
  AcceptInvitationById,
  CreateWorkspace,
  CreateWorkspaceInput,
  CreateWorkspaceResult,
  CreateWorkspaceWithOwner,
  DeleteWorkspace,
  LogoutUser,
  RefreshUser,
  SendEmailVerification,
} from '../../../application/commands';
import type { ListPendingInvitationsForUser, ListWorkspaces } from '../../../application/queries';
import { UserId } from '../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../shared/errors';
import { useI18n } from '../../i18n';
import { AppShell } from '../app-shell/app-shell';
import { CreateWorkspaceDialog } from './components/create-workspace-dialog';
import { PendingInvitationsPanel } from './components/pending-invitations-panel';
import { WorkspacesListContainer } from './components/workspaces-list-container';

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
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.space[8]};
`;

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
  readonly listPendingInvitationsForUser?: ListPendingInvitationsForUser;
  readonly acceptInvitationById?: AcceptInvitationById;
  readonly sendEmailVerification?: SendEmailVerification;
  readonly refreshUser?: RefreshUser;
}

export function WorkspacesPage({
  logoutUser,
  listWorkspaces,
  createWorkspaceWithOwner,
  deleteWorkspace,
  listPendingInvitationsForUser,
  acceptInvitationById,
  sendEmailVerification,
  refreshUser,
}: WorkspacesPageProps): ReactNode {
  const session = useSession();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
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
      onCreateWorkspace={handleCreateWorkspace}
    >
      <Main>
        <Header>
          <Heading as="h1">{t('workspaces.title')}</Heading>
          <Button type="button" variant="primary" onClick={handleCreateWorkspace}>
            <Plus aria-hidden="true" size={16} />
            {t('workspaces.create')}
          </Button>
        </Header>

        <Stack gap="space-8">
          {session.status === 'authenticated' &&
            listPendingInvitationsForUser !== undefined &&
            acceptInvitationById !== undefined && (
              <Section id="pending-invitations">
                <PendingInvitationsPanel
                  userId={session.user.uid}
                  userEmail={session.user.email}
                  userEmailVerified={session.user.emailVerified}
                  listPendingInvitationsForUser={listPendingInvitationsForUser}
                  acceptInvitationById={acceptInvitationById}
                  sendEmailVerification={sendEmailVerification}
                  refreshUser={refreshUser}
                  onAccepted={(workspaceId) => navigate(`/workspaces/${workspaceId}`)}
                />
              </Section>
            )}
          <Section id="workspaces">
            {session.status === 'authenticated' && (
              <WorkspacesListContainer
                userId={session.user.uid}
                listWorkspaces={listWorkspaces}
                deleteWorkspace={deleteWorkspace}
                onCreateWorkspace={handleCreateWorkspace}
                refreshToken={refreshToken}
              />
            )}
          </Section>
        </Stack>
      </Main>
      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        createWorkspace={createWorkspace}
        createdBy={ownerId}
        onCreated={handleCreated}
      />
    </AppShell>
  );
}
