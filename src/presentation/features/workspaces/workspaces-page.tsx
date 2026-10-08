import { Heading, Stack, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { useSession } from '../../../app/providers/session-provider';
import type { LogoutUser } from '../../../application/commands';
import { SignOutButton } from '../auth/sign-out-button';

const Page = styled.main`
  min-height: 100dvh;
  padding: 24px;
`;

export interface WorkspacesPageProps {
  readonly logoutUser: LogoutUser;
}

export function WorkspacesPage({ logoutUser }: WorkspacesPageProps): ReactNode {
  const session = useSession();

  return (
    <Page>
      <Stack gap="space-5">
        <Stack gap="space-2">
          <Heading as="h1">Your workspaces</Heading>
          <Text color="color.text.muted">
            {session.status === 'authenticated' && session.user.email !== null
              ? `${session.user.email} is ready to plan.`
              : 'Your shared plans will live here.'}
          </Text>
        </Stack>
        <SignOutButton logoutUser={logoutUser} />
      </Stack>
    </Page>
  );
}
