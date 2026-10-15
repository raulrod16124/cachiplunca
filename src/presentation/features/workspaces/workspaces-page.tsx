import { Button, Heading, Inline, Stack, Text } from '@raulrod/ui';
import { useMemo, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { useSession } from '../../providers/session-provider';
import type {
  CreateWorkspace,
  CreateWorkspaceInput,
  CreateWorkspaceResult,
  CreateWorkspaceWithOwner,
  LogoutUser,
} from '../../../application/commands';
import type { ListWorkspaces } from '../../../application/queries/list-workspaces';
import { UserId } from '../../../domain/shared';
import { createAppError, ERROR_CODES } from '../../../shared/errors';
import { SignOutButton } from '../auth/sign-out-button';
import { CreateWorkspaceDialog } from './components/create-workspace-dialog';
import { WorkspacesListContainer } from './components/workspaces-list-container';

const Page = styled.main`
  min-height: 100dvh;
  padding: 24px;
`;

export interface WorkspacesPageProps {
  readonly logoutUser: LogoutUser;
  readonly listWorkspaces: ListWorkspaces;
  readonly createWorkspaceWithOwner: CreateWorkspaceWithOwner;
}

export function WorkspacesPage({
  logoutUser,
  listWorkspaces,
  createWorkspaceWithOwner,
}: WorkspacesPageProps): ReactNode {
  const session = useSession();
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
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
              <SignOutButton logoutUser={logoutUser} />
            </Inline>
          </Inline>
        </Stack>
        <WorkspacesListContainer
          listWorkspaces={listWorkspaces}
          onCreateWorkspace={handleCreateWorkspace}
          refreshToken={refreshToken}
        />
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
