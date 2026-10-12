import { Button, Heading, Inline, Skeleton, Stack, Text, VisuallyHidden } from '@raulrod/ui';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { createSnapshotCommand, type LogoutUser } from '../../../../application/commands';
import type {
  GetWorkspace,
  GetWorkspaceResult,
  LoadWorkspaceElements,
} from '../../../../application/queries';
import {
  applyRemoteElementChanges,
  createCanvasViewportStore,
  createCommandHistory,
  createElementPersistenceBatcher,
  createSelectionStore,
  rollbackFailedMutation,
} from '../../../../application/services';
import type {
  CanvasViewportStore,
  CommandHistory,
  ElementPersistenceBatcher,
  ElementPersistenceOrchestrator,
  PersistenceSyncStatus,
  RealtimeSubscriptionManager,
  Scheduler,
  SelectionStore,
} from '../../../../application/services';
import type { Element } from '../../../../domain/element';
import { Size, WorkspaceId } from '../../../../domain/shared';
import type { ElementId } from '../../../../domain/shared';
import { toAppError, type AppError } from '../../../../shared/errors';
import { WorkspaceShellLayout } from './workspace-shell-layout';
import {
  describeCollaborationSyncError,
  describeGetWorkspaceError,
  describeLoadWorkspaceElementsError,
  describePersistElementsError,
} from '../workspace-error-messages';

const Container = styled.div`
  padding: 24px;
`;

export interface WorkspaceShellContainerProps {
  readonly workspaceId: string;
  readonly getWorkspace: GetWorkspace;
  readonly loadWorkspaceElements: LoadWorkspaceElements;
  readonly elementPersistenceOrchestrator: ElementPersistenceOrchestrator;
  readonly realtimeSubscriptionManager: RealtimeSubscriptionManager;
  readonly generateElementId: () => ElementId;
  readonly logoutUser: LogoutUser;
  readonly onBack: () => void;
  readonly persistenceDebounceMs?: number;
  readonly persistenceScheduler?: Scheduler;
}

interface TransformGesture {
  readonly base: readonly Element[];
  readonly label: string;
}

export function WorkspaceShellContainer({
  workspaceId,
  getWorkspace,
  loadWorkspaceElements,
  elementPersistenceOrchestrator,
  realtimeSubscriptionManager,
  generateElementId,
  logoutUser,
  onBack,
  persistenceDebounceMs,
  persistenceScheduler,
}: WorkspaceShellContainerProps): ReactNode {
  const [status, setStatus] = useState<'loading' | 'notFound' | 'error' | 'success'>('loading');
  const [result, setResult] = useState<GetWorkspaceResult | null>(null);
  const [elements, setElements] = useState<readonly Element[]>([]);
  const [elementsStatus, setElementsStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [elementsError, setElementsError] = useState<AppError | null>(null);
  const [persistenceError, setPersistenceError] = useState<AppError | null>(null);
  const [collaborationError, setCollaborationError] = useState<AppError | null>(null);
  const [syncStatus, setSyncStatus] = useState<PersistenceSyncStatus>('idle');
  const elementsRef = useRef<readonly Element[]>([]);
  const canvasViewportStoreRef = useRef<CanvasViewportStore>(
    createCanvasViewportStore(Size.create(800, 600)),
  );
  const selectionStoreRef = useRef<SelectionStore>(createSelectionStore());
  const commandHistoryRef = useRef<CommandHistory<readonly Element[]>>(
    createCommandHistory<readonly Element[]>({ initial: [] }),
  );
  const persistenceBatcherRef = useRef<ElementPersistenceBatcher | null>(null);

  if (persistenceBatcherRef.current === null) {
    persistenceBatcherRef.current = createElementPersistenceBatcher({
      orchestrator: elementPersistenceOrchestrator,
      onResult: (result) => {
        setPersistenceError(result.status === 'error' ? result.error : null);
      },
      onStatusChange: setSyncStatus,
      onMutationFailed: (mutation) => {
        const rolledBack = rollbackFailedMutation(
          elementsRef.current,
          mutation.previous,
          mutation.next,
        );
        if (rolledBack !== elementsRef.current) {
          elementsRef.current = rolledBack;
          setElements(rolledBack);
        }
      },
      delayMs: persistenceDebounceMs,
      scheduler: persistenceScheduler,
    });
  }

  const persistenceBatcher = persistenceBatcherRef.current;
  const transformGestureRef = useRef<TransformGesture | null>(null);

  useEffect(() => {
    function flush(): void {
      void persistenceBatcher.flush();
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    }

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flush();
    };
  }, [persistenceBatcher]);

  const applyElements = useCallback((next: readonly Element[]): void => {
    elementsRef.current = next;
    setElements(next);
  }, []);

  const persistElements = useCallback(
    (previous: readonly Element[], next: readonly Element[]): void => {
      applyElements(next);
      persistenceBatcher.schedule(previous, next);
    },
    [applyElements, persistenceBatcher],
  );

  const commitElements = useCallback(
    (next: readonly Element[], label: string): void => {
      const previous = elementsRef.current;

      if (previous === next) {
        return;
      }

      const result = commandHistoryRef.current.execute(
        createSnapshotCommand(previous, next, label),
      );

      if (result.status === 'error') {
        return;
      }

      applyElements(result.state);
      persistenceBatcher.schedule(previous, result.state);
      void persistenceBatcher.flush();
    },
    [applyElements, persistenceBatcher],
  );

  const handleMoveElements = useCallback(
    (next: readonly Element[]) => {
      const previous = elementsRef.current;

      if (previous === next) {
        return;
      }

      transformGestureRef.current ??= { base: previous, label: 'Move elements' };
      persistElements(previous, next);
    },
    [persistElements],
  );

  const handleResizeElements = useCallback(
    (next: readonly Element[]) => {
      const previous = elementsRef.current;

      if (previous === next) {
        return;
      }

      transformGestureRef.current ??= { base: previous, label: 'Resize elements' };
      persistElements(previous, next);
    },
    [persistElements],
  );

  const handleTransformEnd = useCallback((): void => {
    const gesture = transformGestureRef.current;

    if (gesture === null) {
      return;
    }

    transformGestureRef.current = null;
    commandHistoryRef.current.execute(
      createSnapshotCommand(gesture.base, elementsRef.current, gesture.label),
    );
    void persistenceBatcher.flush();
  }, [persistenceBatcher]);

  const handleDeleteElements = useCallback(
    (next: readonly Element[]) => {
      commitElements(next, 'Delete elements');
    },
    [commitElements],
  );

  const handleDuplicateElements = useCallback(
    (next: readonly Element[]) => {
      commitElements(next, 'Duplicate elements');
    },
    [commitElements],
  );

  const handlePasteElements = useCallback(
    (next: readonly Element[]) => {
      commitElements(next, 'Paste elements');
    },
    [commitElements],
  );

  const handleUndoElements = useCallback(
    (restored: readonly Element[]) => {
      const previous = elementsRef.current;
      applyElements(restored);
      persistenceBatcher.schedule(previous, restored);
      void persistenceBatcher.flush();
    },
    [applyElements, persistenceBatcher],
  );

  const handleRedoElements = useCallback(
    (restored: readonly Element[]) => {
      const previous = elementsRef.current;
      applyElements(restored);
      persistenceBatcher.schedule(previous, restored);
      void persistenceBatcher.flush();
    },
    [applyElements, persistenceBatcher],
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
        elementsRef.current = response.elements;
        setElements(response.elements);
        setPersistenceError(null);
        setSyncStatus('idle');
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

  useEffect(() => {
    if (elementsStatus !== 'success') {
      return;
    }

    setCollaborationError(null);

    const unsubscribe = realtimeSubscriptionManager.subscribe(
      WorkspaceId.create(workspaceId),
      (event) => {
        const next = applyRemoteElementChanges(elementsRef.current, event);

        if (next !== elementsRef.current) {
          applyElements(next);
        }
      },
      (error) => {
        setCollaborationError(error);
      },
    );

    return unsubscribe;
  }, [realtimeSubscriptionManager, workspaceId, elementsStatus, applyElements]);

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
        onMoveElements={handleMoveElements}
        onResizeElements={handleResizeElements}
        onTransformEnd={handleTransformEnd}
        onDeleteElements={handleDeleteElements}
        onDuplicateElements={handleDuplicateElements}
        onPasteElements={handlePasteElements}
        onUndoElements={handleUndoElements}
        onRedoElements={handleRedoElements}
        generateElementId={generateElementId}
        syncStatus={syncStatus}
        persistenceErrorMessage={
          persistenceError === null ? null : describePersistElementsError(persistenceError)
        }
        collaborationErrorMessage={
          collaborationError === null ? null : describeCollaborationSyncError(collaborationError)
        }
      />
    );
  }

  return null;
}
