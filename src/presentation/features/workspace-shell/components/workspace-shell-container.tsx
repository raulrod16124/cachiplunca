import { Skeleton, Stack } from '@raulrod/ui';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import styled from 'styled-components';
import {
  createCreateElement,
  createUpdateElement,
  type ChangeMemberRole,
  type CreateElementInput,
  type InviteMember,
  type LeaveWorkspace,
  type LogoutUser,
  type RemoveMember,
  type UpdateElementInput,
  type UpdateWorkspace,
  type UpdateWorkspaceResult,
} from '../../../../application/commands';
import type {
  GetWorkspace,
  GetWorkspaceResult,
  GetWorkspaceRole,
  ListPendingInvitations,
  ListWorkspaceMembers,
  LoadWorkspaceElements,
} from '../../../../application/queries';
import {
  applyRemoteElementChanges,
  buildConnectorCreateInput,
  buildElementCreateInput,
  connectorEndpoints,
  createBoardWindowCommand,
  createCanvasViewportStore,
  createCommandHistory,
  createConnectedUsersStore,
  createCursorBroadcaster,
  createElementPersistenceBatcher,
  createRealtimeConnectionStore,
  createRemoteCursorsStore,
  createSelectionStore,
  createSharedPresencePort,
  defaultElementSize,
  elementContentBounds,
  EMPTY_CONNECTED_USERS_STORE,
  EMPTY_REMOTE_CURSORS_STORE,
  resolveElementCreatePosition,
  rollbackFailedMutation,
} from '../../../../application/services';
import type {
  CanvasViewportStore,
  CommandHistory,
  ConnectedUsersStore,
  CursorBroadcaster,
  ElementPersistenceBatcher,
  ElementPersistenceOrchestrator,
  PersistenceSyncStatus,
  RealtimeConnectionStore,
  RealtimeSubscriptionManager,
  RemoteCursorsStore,
  Scheduler,
  SelectionStore,
} from '../../../../application/services';
import type {
  AuthUser,
  PresencePort,
  RealtimeConnectionStatus,
} from '../../../../application/ports';
import type { Element, ElementType } from '../../../../domain/element';
import type { MembershipRole } from '../../../../domain/membership';
import { Presence } from '../../../../domain/collaboration';
import { Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { useWorkspacePermissions } from '../../../hooks';
import type { ElementId } from '../../../../domain/shared';
import { toAppError, type AppError } from '../../../../shared/errors';
import { EmptyState } from '../../../components/empty-state';
import { ErrorState } from '../../../components/error-state';
import { LoadingState } from '../../../components/loading-state';
import { ShareDialog } from '../../sharing';
import { WorkspaceShellLayout } from './workspace-shell-layout';
import {
  describeCollaborationSyncError,
  describeCreateElementError,
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
  readonly currentUser?: AuthUser | null;
  readonly presencePort?: PresencePort;
  readonly localUserId?: string;
  readonly selectionStore?: SelectionStore;
  readonly persistenceDebounceMs?: number;
  readonly persistenceScheduler?: Scheduler;
  readonly inviteMember?: InviteMember;
  readonly listPendingInvitations?: ListPendingInvitations;
  readonly getWorkspaceRole?: GetWorkspaceRole;
  readonly listWorkspaceMembers?: ListWorkspaceMembers;
  readonly changeMemberRole?: ChangeMemberRole;
  readonly removeMember?: RemoveMember;
  readonly leaveWorkspace?: LeaveWorkspace;
  readonly updateWorkspace?: UpdateWorkspace;
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
  currentUser = null,
  presencePort,
  localUserId,
  selectionStore,
  persistenceDebounceMs,
  persistenceScheduler,
  inviteMember,
  listPendingInvitations,
  getWorkspaceRole,
  listWorkspaceMembers,
  changeMemberRole,
  removeMember,
  leaveWorkspace,
  updateWorkspace,
}: WorkspaceShellContainerProps): ReactNode {
  const [status, setStatus] = useState<'loading' | 'notFound' | 'error' | 'success'>('loading');
  const [shareOpen, setShareOpen] = useState(false);
  const [role, setRole] = useState<MembershipRole | undefined>(undefined);
  const [roleStatus, setRoleStatus] = useState<'idle' | 'loading' | 'settled' | 'failed'>(
    getWorkspaceRole === undefined ? 'idle' : 'loading',
  );
  const [roleAttempt, setRoleAttempt] = useState(0);
  const permissions = useWorkspacePermissions(role);
  const [result, setResult] = useState<GetWorkspaceResult | null>(null);
  const [elements, setElements] = useState<readonly Element[]>([]);
  const [elementsStatus, setElementsStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [elementsError, setElementsError] = useState<AppError | null>(null);
  const [persistenceError, setPersistenceError] = useState<AppError | null>(null);
  const [collaborationError, setCollaborationError] = useState<AppError | null>(null);
  const [creationError, setCreationError] = useState<AppError | null>(null);
  const [syncStatus, setSyncStatus] = useState<PersistenceSyncStatus>('idle');
  const elementsRef = useRef<readonly Element[]>([]);
  const canvasViewportStoreRef = useRef<CanvasViewportStore>(
    createCanvasViewportStore(Size.create(800, 600)),
  );
  const selectionStoreRef = useRef<SelectionStore>(selectionStore ?? createSelectionStore());
  const connectionStoreRef = useRef<RealtimeConnectionStore>(createRealtimeConnectionStore());
  const connectionStatus = useSyncExternalStore(
    connectionStoreRef.current.subscribe,
    connectionStoreRef.current.getSnapshot,
  ).status;
  const previousConnectionStatusRef = useRef<RealtimeConnectionStatus>('connected');
  const commandHistoryRef = useRef<CommandHistory<readonly Element[]>>(
    createCommandHistory<readonly Element[]>({ initial: [] }),
  );
  const persistenceBatcherRef = useRef<ElementPersistenceBatcher | null>(null);

  const sharedPresencePort = useMemo(
    () => (presencePort === undefined ? undefined : createSharedPresencePort(presencePort)),
    [presencePort],
  );

  const remoteCursorsStore = useMemo<RemoteCursorsStore>(() => {
    if (sharedPresencePort === undefined || localUserId === undefined) {
      return EMPTY_REMOTE_CURSORS_STORE;
    }

    return createRemoteCursorsStore(
      sharedPresencePort,
      WorkspaceId.create(workspaceId),
      UserId.create(localUserId),
    );
  }, [sharedPresencePort, localUserId, workspaceId]);

  const remoteCursors = useSyncExternalStore(
    remoteCursorsStore.subscribe,
    remoteCursorsStore.getSnapshot,
  ).cursors;

  const connectedUsersStore = useMemo<ConnectedUsersStore>(() => {
    if (sharedPresencePort === undefined) {
      return EMPTY_CONNECTED_USERS_STORE;
    }

    return createConnectedUsersStore(sharedPresencePort, WorkspaceId.create(workspaceId));
  }, [sharedPresencePort, workspaceId]);

  const connectedUsers = useSyncExternalStore(
    connectedUsersStore.subscribe,
    connectedUsersStore.getSnapshot,
  ).users.filter((presence) => presence.userId.value !== localUserId);

  const cursorBroadcaster = useMemo<CursorBroadcaster | null>(() => {
    if (sharedPresencePort === undefined || localUserId === undefined) {
      return null;
    }

    return createCursorBroadcaster({
      presencePort: sharedPresencePort,
      basePresence: Presence.create({
        userId: UserId.create(localUserId),
        workspaceId: WorkspaceId.create(workspaceId),
      }),
      onError: (error) => {
        setCollaborationError(error);
      },
    });
  }, [presencePort, localUserId, workspaceId]);

  const handleCursorMove = useCallback(
    (position: Position) => {
      cursorBroadcaster?.move(position);
    },
    [cursorBroadcaster],
  );

  useEffect(() => {
    if (cursorBroadcaster === null || elementsStatus !== 'success') {
      return;
    }

    cursorBroadcaster.join();
  }, [cursorBroadcaster, elementsStatus]);

  useEffect(() => {
    if (cursorBroadcaster === null) {
      return;
    }

    const broadcaster = cursorBroadcaster;

    function handlePagehide(): void {
      void broadcaster.leave();
    }

    window.addEventListener('pagehide', handlePagehide);

    return () => {
      window.removeEventListener('pagehide', handlePagehide);
      void broadcaster.leave();
    };
  }, [cursorBroadcaster]);

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
        createBoardWindowCommand({
          readCurrent: () => elementsRef.current,
          previous,
          next,
          label,
        }),
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

  const createElement = useMemo(
    () => createCreateElement({ generateId: generateElementId }),
    [generateElementId],
  );

  const updateElementCommand = useMemo(() => createUpdateElement(), []);

  const handleUpdateElement = useCallback(
    (input: UpdateElementInput): void => {
      const current = elementsRef.current.find(
        (element) => element.id.value === input.element.id.value,
      );

      if (current === undefined) {
        return;
      }

      const result = updateElementCommand({ ...input, element: current });

      if (result.status === 'error') {
        return;
      }

      const next = elementsRef.current.map((element) =>
        element.id.value === current.id.value ? result.element : element,
      );

      commitElements(next, `Update ${current.type}`);
    },
    [updateElementCommand, commitElements],
  );

  const handleCreateElement = useCallback(
    (type: ElementType): ElementId | void => {
      if (localUserId === undefined) {
        return;
      }

      const workspace = WorkspaceId.create(workspaceId);
      const createdBy = UserId.create(localUserId);
      let input: CreateElementInput;

      if (type === 'connector') {
        const endpoints = connectorEndpoints(selectionStoreRef.current.getSnapshot().selectedIds);

        if (endpoints === null) {
          return;
        }

        const [sourceId, targetId] = endpoints;
        const source = elementsRef.current.find((element) => element.id.value === sourceId);
        const target = elementsRef.current.find((element) => element.id.value === targetId);

        if (source === undefined || target === undefined) {
          return;
        }

        const bounds = elementContentBounds([source, target]);

        if (bounds === null) {
          return;
        }

        input = buildConnectorCreateInput(source.id, target.id, {
          workspaceId: workspace,
          createdBy,
          position: bounds.position,
          size: bounds.size,
        });
      } else {
        const size = defaultElementSize(type);
        const position = resolveElementCreatePosition(
          canvasViewportStoreRef.current.getSnapshot(),
          size,
        );

        input = buildElementCreateInput(type, {
          workspaceId: workspace,
          createdBy,
          position,
          size,
        });
      }

      const result = createElement(input);

      if (result.status === 'error') {
        setCreationError(result.error);
        return;
      }

      setCreationError(null);
      commitElements([...elementsRef.current, result.element], `Create ${type}`);
      selectionStoreRef.current.select(result.element.id.value);

      return result.element.id;
    },
    [localUserId, workspaceId, createElement, commitElements],
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
      createBoardWindowCommand({
        readCurrent: () => elementsRef.current,
        previous: gesture.base,
        next: elementsRef.current,
        label: gesture.label,
      }),
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

  const handleRenameWorkspace = useCallback(
    async (name: string): Promise<UpdateWorkspaceResult> => {
      if (updateWorkspace === undefined) {
        return {
          status: 'error',
          error: toAppError(new Error('Renaming is not available.')),
        };
      }

      const result = await updateWorkspace({ id: workspaceId, name });
      if (result.status === 'ok') {
        setResult((previous) =>
          previous === null || previous.status !== 'ok'
            ? previous
            : { status: 'ok', workspace: result.workspace },
        );
      }
      return result;
    },
    [updateWorkspace, workspaceId],
  );

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
    if (getWorkspaceRole === undefined || localUserId === undefined) {
      setRole(undefined);
      setRoleStatus('idle');
      return;
    }

    let active = true;
    setRoleStatus('loading');

    void (async () => {
      try {
        const response = await getWorkspaceRole(localUserId, workspaceId);
        if (!active) {
          return;
        }
        if (response.status === 'ok') {
          setRole(response.role);
          setRoleStatus('settled');
          return;
        }
        setRole(undefined);
        setRoleStatus(response.status === 'notFound' ? 'settled' : 'failed');
      } catch {
        if (!active) {
          return;
        }
        setRole(undefined);
        setRoleStatus('failed');
      }
    })();

    return () => {
      active = false;
    };
  }, [getWorkspaceRole, localUserId, workspaceId, roleAttempt]);

  const handleRetryRole = useCallback(() => {
    setRoleAttempt((attempt) => attempt + 1);
  }, []);

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
        selectionStoreRef.current.retain(next.map((element) => element.id.value));
      },
      (error) => {
        setCollaborationError(error);
      },
      (connection) => {
        connectionStoreRef.current.setStatus(connection);
      },
    );

    return unsubscribe;
  }, [realtimeSubscriptionManager, workspaceId, elementsStatus, applyElements]);

  useEffect(() => {
    const previous = previousConnectionStatusRef.current;
    previousConnectionStatusRef.current = connectionStatus;

    if (previous === 'reconnecting' && connectionStatus === 'connected') {
      void persistenceBatcher.flush();
      setCollaborationError(null);
    }
  }, [connectionStatus, persistenceBatcher]);

  if (status === 'loading') {
    return (
      <Container>
        <LoadingState label="Loading workspace">
          <Stack gap="space-4">
            <Skeleton style={{ height: '32px', width: '40%' }} />
            <Skeleton style={{ height: '400px', width: '100%' }} />
          </Stack>
        </LoadingState>
      </Container>
    );
  }

  if (status === 'notFound') {
    return (
      <Container>
        <EmptyState
          title="Workspace not found"
          titleAs="h1"
          description="The workspace you are looking for does not exist or you do not have access to it."
          actionLabel="Back to workspaces"
          onAction={onBack}
        />
      </Container>
    );
  }

  if (status === 'error') {
    const errorMessage =
      result?.status === 'error'
        ? describeGetWorkspaceError(result.error)
        : 'Something went wrong.';

    return (
      <Container>
        <ErrorState
          title="Could not load workspace"
          titleAs="h1"
          description={errorMessage}
          actionLabel="Retry"
          onAction={fetchWorkspace}
          secondaryActionLabel="Back to workspaces"
          onSecondaryAction={onBack}
        />
      </Container>
    );
  }

  if (result?.status === 'ok') {
    if (elementsStatus === 'loading' || roleStatus === 'loading') {
      return (
        <Container>
          <LoadingState label="Loading board">
            <Stack gap="space-4">
              <Skeleton style={{ height: '32px', width: '40%' }} />
              <Skeleton style={{ height: '400px', width: '100%' }} />
            </Stack>
          </LoadingState>
        </Container>
      );
    }

    if (elementsStatus === 'error') {
      const errorMessage =
        elementsError === null
          ? 'Something went wrong.'
          : describeLoadWorkspaceElementsError(elementsError);

      return (
        <Container>
          <ErrorState
            title="Could not load board"
            titleAs="h1"
            description={errorMessage}
            actionLabel="Retry"
            onAction={fetchElements}
            secondaryActionLabel="Back to workspaces"
            onSecondaryAction={onBack}
          />
        </Container>
      );
    }

    const permissionsEnforced = getWorkspaceRole !== undefined;
    const canElementWrite = !permissionsEnforced || permissions.can('element:write');
    const canMemberInvite = !permissionsEnforced || permissions.can('member:invite');
    const canMemberUpdateRole = !permissionsEnforced || permissions.can('member:update-role');
    const canMemberRemove = !permissionsEnforced || permissions.can('member:remove');
    const canMemberLeave = !permissionsEnforced || permissions.can('member:leave');
    const canCreateElement = canElementWrite && localUserId !== undefined;
    const canRename =
      updateWorkspace !== undefined &&
      (!permissionsEnforced || permissions.can('workspace:update'));

    const canShare =
      localUserId !== undefined &&
      listWorkspaceMembers !== undefined &&
      leaveWorkspace !== undefined &&
      (!permissionsEnforced || role !== undefined);

    return (
      <>
        <WorkspaceShellLayout
          workspace={result.workspace}
          elements={elements}
          role={role}
          currentUser={currentUser}
          connectedUsers={connectedUsers}
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
          onCreateElement={canCreateElement ? handleCreateElement : undefined}
          onUpdateElement={canElementWrite ? handleUpdateElement : undefined}
          generateElementId={generateElementId}
          remoteCursors={remoteCursors}
          onCursorMove={cursorBroadcaster === null ? undefined : handleCursorMove}
          syncStatus={syncStatus}
          connectionStatus={connectionStatus}
          persistenceErrorMessage={
            persistenceError === null ? null : describePersistElementsError(persistenceError)
          }
          collaborationErrorMessage={
            collaborationError === null ? null : describeCollaborationSyncError(collaborationError)
          }
          creationErrorMessage={
            creationError === null ? null : describeCreateElementError(creationError)
          }
          readOnly={!canElementWrite}
          accessErrorMessage={
            roleStatus === 'failed'
              ? 'We could not verify your access to this workspace. The board is view-only.'
              : null
          }
          onRetryRole={roleStatus === 'failed' ? handleRetryRole : undefined}
          onShare={canShare ? () => setShareOpen(true) : undefined}
          onRename={canRename ? handleRenameWorkspace : undefined}
        />
        {canShare ? (
          <ShareDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            workspaceId={workspaceId}
            currentUserId={localUserId}
            canInvite={canMemberInvite}
            canChangeRole={canMemberUpdateRole}
            canRemove={canMemberRemove}
            canLeave={canMemberLeave}
            listWorkspaceMembers={listWorkspaceMembers}
            leaveWorkspace={leaveWorkspace}
            changeMemberRole={changeMemberRole}
            removeMember={removeMember}
            inviteMember={inviteMember}
            listPendingInvitations={listPendingInvitations}
            onLeft={onBack}
          />
        ) : null}
      </>
    );
  }

  return null;
}
