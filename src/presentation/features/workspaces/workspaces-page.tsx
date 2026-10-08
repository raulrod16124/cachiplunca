import { Button, Heading, Inline, Stack, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { useSession } from '../../../app/providers/session-provider';
import type { LogoutUser } from '../../../application/commands';
import type { ListWorkspaces } from '../../../application/queries/list-workspaces';
import { SignOutButton } from '../auth/sign-out-button';
import { WorkspacesListContainer } from './components/workspaces-list-container';

const Page = styled.main`
  min-height: 100dvh;
  padding: 24px;
`;

export interface WorkspacesPageProps {
  readonly logoutUser: LogoutUser;
  readonly listWorkspaces: ListWorkspaces;
}

export function WorkspacesPage({ logoutUser, listWorkspaces }: WorkspacesPageProps): ReactNode {
  const session = useSession();

  const handleCreateWorkspace = () => {
    // Placeholder: will be implemented in TASK-024
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
        />
      </Stack>
    </Page>
  );
}
