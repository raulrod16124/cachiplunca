import { Button, Heading, Inline, Skeleton, Stack, Text, VisuallyHidden } from '@raulrod/ui';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import type { LogoutUser } from '../../../../application/commands';
import type { GetWorkspace, GetWorkspaceResult } from '../../../../application/queries';
import { toAppError } from '../../../../shared/errors';
import { WorkspaceShellLayout } from './workspace-shell-layout';
import { describeGetWorkspaceError } from '../workspace-error-messages';

const Container = styled.div`
  padding: 24px;
`;

export interface WorkspaceShellContainerProps {
  readonly workspaceId: string;
  readonly getWorkspace: GetWorkspace;
  readonly logoutUser: LogoutUser;
  readonly onBack: () => void;
}

export function WorkspaceShellContainer({
  workspaceId,
  getWorkspace,
  logoutUser,
  onBack,
}: WorkspaceShellContainerProps): ReactNode {
  const [status, setStatus] = useState<'loading' | 'notFound' | 'error' | 'success'>('loading');
  const [result, setResult] = useState<GetWorkspaceResult | null>(null);

  const fetchWorkspace = useCallback(async (): Promise<void> => {
    setStatus('loading');
    try {
      const response = await getWorkspace(workspaceId);
      setResult(response);
      setStatus(response.status === 'ok' ? 'success' : response.status);
    } catch (error) {
      setResult({ status: 'error', error: toAppError(error) });
      setStatus('error');
    }
  }, [getWorkspace, workspaceId]);

  useEffect(() => {
    void fetchWorkspace();
  }, [fetchWorkspace]);

  if (status === 'loading') {
    return (
      <Container role="status" aria-busy="true">
        <VisuallyHidden>Loading workspace</VisuallyHidden>
        <Stack gap="space-4">
          <Skeleton style={{ height: '32px', width: '40%' }} />
          <Skeleton style={{ height: '400px', width: '100%' }} />
        </Stack>
      </Container>
    );
  }

  if (status === 'notFound') {
    return (
      <Container>
        <Stack gap="space-4">
          <Heading as="h1">Workspace not found</Heading>
          <Text color="color.text.muted">
            The workspace you are looking for does not exist or you do not have access to it.
          </Text>
          <Inline gap="space-2">
            <Button type="button" variant="primary" onClick={onBack}>
              Back to workspaces
            </Button>
          </Inline>
        </Stack>
      </Container>
    );
  }

  if (status === 'error') {
    const errorMessage =
      result?.status === 'error'
        ? describeGetWorkspaceError(result.error)
        : 'Something went wrong.';

    return (
      <Container role="alert" aria-live="polite">
        <Stack gap="space-4">
          <Heading as="h1">Could not load workspace</Heading>
          <Text color="color.text.muted">{errorMessage}</Text>
          <Inline gap="space-2">
            <Button type="button" variant="primary" onClick={fetchWorkspace}>
              Retry
            </Button>
            <Button type="button" variant="outline" onClick={onBack}>
              Back to workspaces
            </Button>
          </Inline>
        </Stack>
      </Container>
    );
  }

  if (result?.status === 'ok') {
    return (
      <WorkspaceShellLayout workspace={result.workspace} logoutUser={logoutUser} onBack={onBack} />
    );
  }

  return null;
}
