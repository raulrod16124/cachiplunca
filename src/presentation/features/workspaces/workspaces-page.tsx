import { Button, Heading, Inline, Stack, Text } from '@raulrod/ui';
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
  LogoutUser,
} from '../../../application/commands';
import type {
  GetWorkspace,
  ListPendingInvitationsForUser,
  ListWorkspaces,
} from '../../../application/queries';
import { UserId } from '../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../shared/errors';
import { AccountMenu } from '../auth/account-menu';
import { CreateWorkspaceDialog } from './components/create-workspace-dialog';
import { PendingInvitationsPanel } from './components/pending-invitations-panel';
import { WorkspacesListContainer } from './components/workspaces-list-container';

const Page = styled.main`
  min-height: 100dvh;
  padding: 24px;
`;

export interface WorkspacesPageProps {
  readonly logoutUser: LogoutUser;
  readonly listWorkspaces: ListWorkspaces;
  readonly createWorkspaceWithOwner: CreateWorkspaceWithOwner;
  readonly getWorkspace: GetWorkspace;
  readonly listPendingInvitationsForUser?: ListPendingInvitationsForUser;
  readonly acceptInvitationById?: AcceptInvitationById;
}

export function WorkspacesPage({
  logoutUser,
  listWorkspaces,
  createWorkspaceWithOwner,
  getWorkspace,
  listPendingInvitationsForUser,
  acceptInvitationById,
}: WorkspacesPageProps): ReactNode {
  const session = useSession();
  const navigate = useNavigate();
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
    <Page>
      <Stack gap="space-6">
        <Stack gap="space-4">
          <Inline justify="between" align="start" wrap gap="space-3">
            <Stack gap="space-2">
              <Heading as="h1">Your workspaces</Heading>
              <Text color="color.text.muted">
                {session.status === 'authenticated' && session.user.email !== null
                  ? `${session.user.email} is ready to plan.`
                  : 'Your shared plans will live here.'}
              </Text>
            </Stack>
            <Inline gap="space-2" align="center">
              <Button type="button" variant="primary" onClick={handleCreateWorkspace}>
                Create workspace
              </Button>
              <AccountMenu currentUser={currentUser} logoutUser={logoutUser} />
            </Inline>
          </Inline>
        </Stack>
        {session.status === 'authenticated' &&
          listPendingInvitationsForUser !== undefined &&
          acceptInvitationById !== undefined && (
            <PendingInvitationsPanel
              userId={session.user.uid}
              userEmail={session.user.email}
              listPendingInvitationsForUser={listPendingInvitationsForUser}
              acceptInvitationById={acceptInvitationById}
              getWorkspace={getWorkspace}
              onAccepted={(workspaceId) => navigate(`/workspaces/${workspaceId}`)}
            />
          )}
        {session.status === 'authenticated' && (
          <WorkspacesListContainer
            userId={session.user.uid}
            listWorkspaces={listWorkspaces}
            onCreateWorkspace={handleCreateWorkspace}
            refreshToken={refreshToken}
          />
        )}
      </Stack>
      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        createWorkspace={createWorkspace}
        createdBy={ownerId}
        onCreated={handleCreated}
      />
    </Page>
  );
}
