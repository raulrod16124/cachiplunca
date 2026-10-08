import { Button, Heading, Inline, Stack, Text } from '@raulrod/ui';
import { useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { useSession } from '../../../app/providers/session-provider';
import type { CreateWorkspace, LogoutUser } from '../../../application/commands';
import type { ListWorkspaces } from '../../../application/queries/list-workspaces';
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
  readonly createWorkspace: CreateWorkspace;
}

export function WorkspacesPage({
  logoutUser,
  listWorkspaces,
  createWorkspace,
}: WorkspacesPageProps): ReactNode {
  const session = useSession();
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

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
        onCreated={handleCreated}
      />
    </Page>
  );
}
