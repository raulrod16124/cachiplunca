import { Button, Heading, Inline, Skeleton, Stack, Text, VisuallyHidden } from '@raulrod/ui';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import type { LogoutUser } from '../../../../application/commands';
import type {
  GetWorkspace,
  GetWorkspaceResult,
  LoadWorkspaceElements,
} from '../../../../application/queries';
import {
  createCanvasViewportStore,
  createCommandHistory,
  createSelectionStore,
} from '../../../../application/services';
import type {
  CanvasViewportStore,
  CommandHistory,
  SelectionStore,
} from '../../../../application/services';
import type { Element } from '../../../../domain/element';
import { Size } from '../../../../domain/shared';
import { toAppError, type AppError } from '../../../../shared/errors';
import { WorkspaceShellLayout } from './workspace-shell-layout';
import {
  describeGetWorkspaceError,
  describeLoadWorkspaceElementsError,
} from '../workspace-error-messages';

const Container = styled.div`
  padding: 24px;
`;

export interface WorkspaceShellContainerProps {
  readonly workspaceId: string;
  readonly getWorkspace: GetWorkspace;
  readonly loadWorkspaceElements: LoadWorkspaceElements;
  readonly logoutUser: LogoutUser;
  readonly onBack: () => void;
}

export function WorkspaceShellContainer({
  workspaceId,
  getWorkspace,
  loadWorkspaceElements,
  logoutUser,
  onBack,
}: WorkspaceShellContainerProps): ReactNode {
  const [status, setStatus] = useState<'loading' | 'notFound' | 'error' | 'success'>('loading');
  const [result, setResult] = useState<GetWorkspaceResult | null>(null);
  const [elements, setElements] = useState<readonly Element[]>([]);
  const [elementsStatus, setElementsStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [elementsError, setElementsError] = useState<AppError | null>(null);
  const canvasViewportStoreRef = useRef<CanvasViewportStore>(
    createCanvasViewportStore(Size.create(800, 600)),
  );
  const selectionStoreRef = useRef<SelectionStore>(createSelectionStore());
  const commandHistoryRef = useRef<CommandHistory<readonly Element[]>>(
    createCommandHistory<readonly Element[]>({ initial: [] }),
  );

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

  const fetchElements = useCallback(async (): Promise<void> => {
    setElementsStatus('loading');
    setElementsError(null);
    try {
      const response = await loadWorkspaceElements(workspaceId);
      if (response.status === 'ok') {
        setElements(response.elements);
        setElementsStatus('success');
        return;
      }
      setElementsError(response.error);
      setElementsStatus('error');
    } catch (error) {
      setElementsError(toAppError(error));
      setElementsStatus('error');
    }
  }, [loadWorkspaceElements, workspaceId]);

  useEffect(() => {
    void fetchWorkspace();
  }, [fetchWorkspace]);

  useEffect(() => {
    if (status === 'success') {
      void fetchElements();
    }
  }, [status, fetchElements]);

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
    if (elementsStatus === 'loading') {
      return (
        <Container role="status" aria-busy="true">
          <VisuallyHidden>Loading board</VisuallyHidden>
          <Stack gap="space-4">
            <Skeleton style={{ height: '32px', width: '40%' }} />
            <Skeleton style={{ height: '400px', width: '100%' }} />
          </Stack>
        </Container>
      );
    }

    if (elementsStatus === 'error') {
      const errorMessage =
        elementsError === null
          ? 'Something went wrong.'
          : describeLoadWorkspaceElementsError(elementsError);

      return (
        <Container role="alert" aria-live="polite">
          <Stack gap="space-4">
            <Heading as="h1">Could not load board</Heading>
            <Text color="color.text.muted">{errorMessage}</Text>
            <Inline gap="space-2">
              <Button type="button" variant="primary" onClick={fetchElements}>
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

    return (
      <WorkspaceShellLayout
        workspace={result.workspace}
        elements={elements}
        logoutUser={logoutUser}
        onBack={onBack}
        canvasViewportStore={canvasViewportStoreRef.current}
        selectionStore={selectionStoreRef.current}
        commandHistory={commandHistoryRef.current}
      />
    );
  }

  return null;
}
