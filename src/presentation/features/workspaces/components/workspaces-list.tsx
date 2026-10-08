import { Button, Heading, Inline, Skeleton, Stack, Text, VisuallyHidden } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { Workspace } from '../../../../domain/workspace';

const ListGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
`;

const CardContent = styled(Stack)`
  height: 100%;
  justify-content: space-between;
`;

const CardShell = styled.div`
  background: var(--rr-color-background-surface, #fff);
  border: 1px solid var(--rr-color-border-default, #e2e8f0);
  border-radius: var(--rr-radius-md, 8px);
  padding: 16px;
  display: flex;
  flex-direction: column;
`;

export interface WorkspacesListProps {
  readonly status: 'idle' | 'loading' | 'success' | 'error';
  readonly workspaces: readonly Workspace[];
  readonly errorMessage?: string;
  readonly onRetry: () => void;
  readonly onCreate: () => void;
  readonly onSelect?: (workspace: Workspace) => void;
}

function formatUpdatedAt(workspace: Workspace): string {
  const date = workspace.updatedAt;
  try {
    return `Updated ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
  } catch {
    return 'Updated recently';
  }
}

export function WorkspacesList({
  status,
  workspaces,
  errorMessage,
  onRetry,
  onCreate,
  onSelect,
}: WorkspacesListProps): ReactNode {
  if (status === 'loading' || status === 'idle') {
    return (
      <ListGrid role="status" aria-busy="true">
        <VisuallyHidden>Loading workspaces</VisuallyHidden>
        {Array.from({ length: 6 }).map((_, index) => (
          <CardShell key={`workspace-skeleton-${index}`}>
            <Stack gap="space-3">
              <Skeleton data-testid="skeleton" style={{ height: '20px', width: '70%' }} />
              <Skeleton data-testid="skeleton" style={{ height: '16px', width: '50%' }} />
              <Skeleton data-testid="skeleton" style={{ height: '16px', width: '40%' }} />
            </Stack>
          </CardShell>
        ))}
      </ListGrid>
    );
  }

  if (status === 'error') {
    return (
      <CardShell role="alert" aria-live="polite">
        <Stack gap="space-3" align="start">
          <Heading as="h2">Something went wrong</Heading>
          <Text color="color.text.muted">
            {errorMessage ?? 'We could not load your workspaces. Please try again.'}
          </Text>
          <Inline gap="space-2">
            <Button type="button" variant="primary" onClick={onRetry}>
              Retry
            </Button>
          </Inline>
        </Stack>
      </CardShell>
    );
  }

  if (workspaces.length === 0) {
    return (
      <CardShell>
        <Stack gap="space-4" justify="center">
          <Stack gap="space-2">
            <Heading as="h2">No workspaces yet</Heading>
            <Text color="color.text.muted">
              Create your first workspace to start organizing ideas together.
            </Text>
          </Stack>
          <Button type="button" variant="primary" onClick={onCreate}>
            Create workspace
          </Button>
        </Stack>
      </CardShell>
    );
  }

  return (
    <ListGrid>
      {workspaces.map((workspace) => (
        <CardShell key={workspace.id.value} as="article">
          <CardContent gap="space-3">
            <Stack gap="space-2">
              <Heading as="h3">{workspace.name}</Heading>
              <Text color="color.text.muted">{formatUpdatedAt(workspace)}</Text>
            </Stack>
            {onSelect !== undefined && (
              <Button type="button" variant="outline" size="sm" onClick={() => onSelect(workspace)}>
                Open
              </Button>
            )}
          </CardContent>
        </CardShell>
      ))}
    </ListGrid>
  );
}
