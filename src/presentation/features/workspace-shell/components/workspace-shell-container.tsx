import { Skeleton, Stack } from '@raulrod/ui';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import styled from 'styled-components';
import {
  createCreateElement,
  createUpdateConnectorEndpoint,
  createUpdateElement,
  type ChangeMemberRole,
  type CreateElementInput,
  type InviteMember,
  type LeaveWorkspace,
  type LogoutUser,
  type RemoveMember,
  type UpdateElementInput,
} from '../../../../application/commands';
import type {
  GetWorkspace,
  GetWorkspaceResult,
  GetWorkspaceRole,
  ListPendingInvitations,
  ListWorkspaceMembers,
  ListWorkspaces,
  LoadWorkspaceElements,
} from '../../../../application/queries';
import {
  applyRemoteElementChanges,
  boardExportToJson,
  buildConnectorCreateInput,
  buildElementCreateInput,
  buildFreeConnectorCreateInput,
  connectorCandidateIds,
  countUnresolvedCommentsByElement,
  createBoardExportFileName,
  createBoardWindowCommand,
  createCanvasViewportStore,
  createCommandHistory,
  createConnectedUsersStore,
  createCursorBroadcaster,
  createElementPersistenceBatcher,
  createImageCleanupQueue,
  createRealtimeConnectionStore,
  createRemoteCursorsStore,
  createSelectionStore,
  createSharedPresencePort,
  collectImageStoragePaths,
  collectOrphanedImages,
  DEFAULT_FREE_CONNECTOR_SIZE,
  defaultElementSize,
  elementContentBounds,
  isStoragePathInWorkspace,
  imageAltFromFileName,
  EMPTY_CONNECTED_USERS_STORE,
  EMPTY_REMOTE_CURSORS_STORE,
  parseTaskDueDateInput,
  resolveElementCreatePosition,
  rollbackFailedMutation,
  serializeBoardExport,
  taskDraftFromElement,
  taskPositionFromElement,
} from '../../../../application/services';
import type {
  CanvasViewportStore,
  CommandHistory,
  ConnectedUsersStore,
  CursorBroadcaster,
  ElementPersistenceBatcher,
  ElementPersistenceOrchestrator,
  ImageCleanupQueue,
  PersistenceSyncStatus,
  RealtimeConnectionStore,
  RealtimeSubscriptionManager,
  RemoteCursorsStore,
  Scheduler,
  SelectionStore,
} from '../../../../application/services';
import type {
  AuthUser,
  FileDownloadPort,
  PresencePort,
  RealtimeConnectionStatus,
} from '../../../../application/ports';
import type { CommentServices } from '../../../../application/comment-services';
import type { GuestLinkServices } from '../../../../application/guest-link-services';
import type { ImageServices } from '../../../../application/image-services';
import { isConnectorElement, isImageElement } from '../../../../domain/element';
import type { ConnectorElement, Element, ElementType } from '../../../../domain/element';
import type { Comment } from '../../../../domain/comment';
import type { Membership, MembershipRole } from '../../../../domain/membership';
import { Presence, resolveUserDisplayName } from '../../../../domain/collaboration';
import { Position, Size, UserId, WorkspaceId } from '../../../../domain/shared';
import { useWorkspacePermissions } from '../../../hooks';
import type { ElementId } from '../../../../domain/shared';
import { createAppError, ERROR_CODES, toAppError, type AppError } from '../../../../shared/errors';
import { EmptyState } from '../../../components/empty-state';
import { ErrorState } from '../../../components/error-state';
import { LoadingState } from '../../../components/loading-state';
import type { ConnectorEndpointDragInput } from '../../../canvas/hooks';
import type { TaskFormValues } from '../../../canvas/components/task-form-dialog';
import { ShareDialog } from '../../sharing';
import { localizeMessage, useI18n } from '../../../i18n';
import { WorkspaceShellLayout } from './workspace-shell-layout';
import { BoardPrintView } from './board-print-view';
import {
  describeCollaborationSyncError,
  describeCreateElementError,
  describeGetWorkspaceError,
  describeLoadWorkspaceElementsError,
  describePersistElementsError,
} from '../workspace-error-messages';

function readFileBytes(file: File): Promise<ArrayBuffer | null> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer().catch(() => null);
  }

  if (typeof FileReader === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise<ArrayBuffer | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result instanceof ArrayBuffer ? reader.result : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file);
  });
}

function createInvalidImageFileError() {
  return createAppError(
    'validation',
    ERROR_CODES.IMAGE_INVALID_TYPE,
    'Choose a PNG, JPEG, WebP or GIF image.',
  );
}

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
  readonly imageCleanupDelayMs?: number;
  readonly imageCleanupScheduler?: Scheduler;
  readonly inviteMember?: InviteMember;
  readonly listPendingInvitations?: ListPendingInvitations;
  readonly getWorkspaceRole?: GetWorkspaceRole;
  readonly listWorkspaceMembers?: ListWorkspaceMembers;
  readonly changeMemberRole?: ChangeMemberRole;
  readonly removeMember?: RemoveMember;
  readonly leaveWorkspace?: LeaveWorkspace;
  readonly fileDownload?: FileDownloadPort;
  readonly listWorkspaces?: ListWorkspaces;
  readonly onOpenWorkspace?: (workspaceId: string) => void;
  readonly comments?: CommentServices;
  readonly imageServices?: ImageServices;
  readonly guestLinks?: GuestLinkServices;
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
  imageCleanupDelayMs,
  imageCleanupScheduler,
  inviteMember,
  listPendingInvitations,
  getWorkspaceRole,
  listWorkspaceMembers,
  changeMemberRole,
  removeMember,
  leaveWorkspace,
  fileDownload,
  listWorkspaces,
  onOpenWorkspace,
  comments,
  imageServices,
  guestLinks,
}: WorkspaceShellContainerProps): ReactNode {
  const { t } = useI18n();
  const [status, setStatus] = useState<'loading' | 'notFound' | 'error' | 'success'>('loading');
  const [shareOpen, setShareOpen] = useState(false);
  const [role, setRole] = useState<MembershipRole | undefined>(undefined);
  const [workspaceMembers, setWorkspaceMembers] = useState<readonly Membership[]>([]);
  const [roleStatus, setRoleStatus] = useState<'idle' | 'loading' | 'settled' | 'failed'>(
    getWorkspaceRole === undefined ? 'idle' : 'loading',
  );
  const [roleAttempt, setRoleAttempt] = useState(0);
  const permissions = useWorkspacePermissions(role);
  const [result, setResult] = useState<GetWorkspaceResult | null>(null);
  const [elements, setElements] = useState<readonly Element[]>([]);
  const [workspaceComments, setWorkspaceComments] = useState<readonly Comment[]>([]);
  const [elementsStatus, setElementsStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [elementsError, setElementsError] = useState<AppError | null>(null);
  const [persistenceError, setPersistenceError] = useState<AppError | null>(null);
  const [collaborationError, setCollaborationError] = useState<AppError | null>(null);
  const [creationError, setCreationError] = useState<AppError | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [printRequest, setPrintRequest] = useState<Date | null>(null);
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
  const workspaceIdRef = useRef(workspaceId);
  workspaceIdRef.current = workspaceId;
  const imageCleanupQueueRef = useRef<ImageCleanupQueue | null>(null);

  const sharedPresencePort = useMemo(
    () => (presencePort === undefined ? undefined : createSharedPresencePort(presencePort)),
    [presencePort],
  );

  const localDisplayName = resolveUserDisplayName({
    displayName: currentUser?.displayName,
    email: currentUser?.email,
  });

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
        displayName: localDisplayName,
      }),
      onError: (error) => {
        setCollaborationError(error);
      },
    });
  }, [sharedPresencePort, localUserId, localDisplayName, workspaceId]);

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
      onPersistedMutation: (mutation) => {
        const cleanupQueue = imageCleanupQueueRef.current;

        if (cleanupQueue === null) {
          return;
        }

        const orphaned = collectOrphanedImages(mutation.previous, mutation.next).filter((image) =>
          isStoragePathInWorkspace(image.storagePath, workspaceIdRef.current),
        );

        cleanupQueue.schedule(orphaned);
      },
      delayMs: persistenceDebounceMs,
      scheduler: persistenceScheduler,
    });
  }

  const persistenceBatcher = persistenceBatcherRef.current;
  const transformGestureRef = useRef<TransformGesture | null>(null);

  useEffect(() => {
    if (imageServices !== undefined) {
      imageCleanupQueueRef.current = createImageCleanupQueue({
        deleteImage: imageServices.deleteImage,
        delayMs: imageCleanupDelayMs,
        scheduler: imageCleanupScheduler,
        isStillReferenced: (image) =>
          elementsRef.current.some(
            (element) =>
              isImageElement(element) &&
              (element.storagePath === image.storagePath || element.src === image.src),
          ),
      });
    }

    return () => {
      imageCleanupQueueRef.current?.dispose();
      imageCleanupQueueRef.current = null;
    };
  }, [imageServices, imageCleanupDelayMs, imageCleanupScheduler]);

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
      if (localUserId === undefined || type === 'connector' || type === 'image') {
        return;
      }

      const workspace = WorkspaceId.create(workspaceId);
      const createdBy = UserId.create(localUserId);
      const size = defaultElementSize(type);
      const position = resolveElementCreatePosition(
        canvasViewportStoreRef.current.getSnapshot(),
        size,
      );

      const input = buildElementCreateInput(type, {
        workspaceId: workspace,
        createdBy,
        position,
        size,
      });

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

  const handleUploadImage = useCallback(
    async (file: File, position?: Position): Promise<ElementId | void> => {
      if (imageServices === undefined || localUserId === undefined) {
        return;
      }

      const bytes = await readFileBytes(file);

      if (bytes === null) {
        setCreationError(createInvalidImageFileError());
        return;
      }

      const result = await imageServices.uploadImage({
        workspaceId: WorkspaceId.create(workspaceId),
        file: {
          name: file.name,
          contentType: file.type,
          size: file.size,
          data: bytes,
        },
      });

      if (result.status === 'error') {
        setCreationError(result.error);
        return;
      }

      const size = defaultElementSize('image');
      const createPosition =
        position ??
        resolveElementCreatePosition(canvasViewportStoreRef.current.getSnapshot(), size);
      const created = createElement({
        type: 'image',
        workspaceId: WorkspaceId.create(workspaceId),
        createdBy: UserId.create(localUserId),
        position: createPosition,
        size,
        src: result.image.url,
        alt: imageAltFromFileName(file.name),
        storagePath: result.image.storagePath,
      });

      if (created.status === 'error') {
        setCreationError(created.error);
        return;
      }

      setCreationError(null);
      commitElements([...elementsRef.current, created.element], 'Create image');
      selectionStoreRef.current.select(created.element.id.value);

      return created.element.id;
    },
    [imageServices, localUserId, workspaceId, createElement, commitElements],
  );

  const handleCreateConnector = useCallback(
    (mode: 'free' | 'bound'): ElementId | void => {
      if (localUserId === undefined) {
        return;
      }

      const workspace = WorkspaceId.create(workspaceId);
      const createdBy = UserId.create(localUserId);
      const viewport = canvasViewportStoreRef.current.getSnapshot();
      let input: CreateElementInput;

      if (mode === 'free') {
        const size = DEFAULT_FREE_CONNECTOR_SIZE;
        const position = resolveElementCreatePosition(viewport, size);

        input = buildFreeConnectorCreateInput({
          workspaceId: workspace,
          createdBy,
          position,
          size,
        });
      } else {
        const endpoints = connectorCandidateIds(
          elementsRef.current,
          selectionStoreRef.current.getSnapshot().selectedIds,
        );

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
      }

      const result = createElement(input);

      if (result.status === 'error') {
        setCreationError(result.error);
        return;
      }

      setCreationError(null);
      commitElements([...elementsRef.current, result.element], 'Create connector');
      selectionStoreRef.current.select(result.element.id.value);

      return result.element.id;
    },
    [localUserId, workspaceId, createElement, commitElements],
  );

  const updateConnectorEndpointCommand = useMemo(() => createUpdateConnectorEndpoint(), []);

  const handleUpdateConnectorEndpoint = useCallback(
    (input: ConnectorEndpointDragInput): void => {
      if (localUserId === undefined) {
        return;
      }

      const current = elementsRef.current.find(
        (element): element is ConnectorElement =>
          element.id.value === input.element.id.value && isConnectorElement(element),
      );

      if (current === undefined) {
        return;
      }

      const result = updateConnectorEndpointCommand({
        element: current,
        side: input.side,
        point: input.point,
      });

      if (result.status === 'error') {
        return;
      }

      const next = elementsRef.current.map((element) =>
        element.id.value === current.id.value ? result.element : element,
      );

      transformGestureRef.current ??= { base: elementsRef.current, label: 'Update connector' };
      persistElements(elementsRef.current, next);
    },
    [localUserId, updateConnectorEndpointCommand, persistElements],
  );

  const handleCreateTask = useCallback(
    (values: TaskFormValues): ElementId | void => {
      if (localUserId === undefined) {
        return;
      }

      const size = defaultElementSize('task');
      const position = resolveElementCreatePosition(
        canvasViewportStoreRef.current.getSnapshot(),
        size,
      );
      const notes = values.notes.trim();
      let dueDate: Date | undefined;

      try {
        dueDate = parseTaskDueDateInput(values.dueDate);
      } catch (error) {
        setCreationError(toAppError(error));
        return;
      }

      const input: CreateElementInput = {
        type: 'task',
        workspaceId: WorkspaceId.create(workspaceId),
        createdBy: UserId.create(localUserId),
        position,
        size,
        title: values.title,
        status: values.status,
        ...(notes === '' ? {} : { notes }),
        ...(values.assigneeId === '' ? {} : { assigneeId: UserId.create(values.assigneeId) }),
        ...(dueDate === undefined ? {} : { dueDate }),
      };

      const result = createElement(input);

      if (result.status === 'error') {
        setCreationError(result.error);
        return;
      }

      setCreationError(null);
      commitElements([...elementsRef.current, result.element], 'Create task');
      selectionStoreRef.current.select(result.element.id.value);

      return result.element.id;
    },
    [localUserId, workspaceId, createElement, commitElements],
  );

  const handleCreateTaskFromElement = useCallback(
    (source: Element): ElementId | void => {
      if (localUserId === undefined) {
        return;
      }

      const draft = taskDraftFromElement(source);

      if (draft === null) {
        return;
      }

      const size = defaultElementSize('task');
      const input: CreateElementInput = {
        type: 'task',
        workspaceId: WorkspaceId.create(workspaceId),
        createdBy: UserId.create(localUserId),
        position: taskPositionFromElement(source),
        size,
        title: draft.title,
        status: 'todo',
        ...(draft.notes === undefined ? {} : { notes: draft.notes }),
      };

      const result = createElement(input);

      if (result.status === 'error') {
        setCreationError(result.error);
        return;
      }

      setCreationError(null);
      commitElements([...elementsRef.current, result.element], 'Create task from element');
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

  const handleRotateElements = useCallback(
    (next: readonly Element[]) => {
      const previous = elementsRef.current;

      if (previous === next) {
        return;
      }

      transformGestureRef.current ??= { base: previous, label: 'Rotate elements' };
      persistElements(previous, next);
    },
    [persistElements],
  );

  const handleAlignElements = useCallback(
    (next: readonly Element[]) => {
      commitElements(next, 'Align elements');
    },
    [commitElements],
  );

  const handleDistributeElements = useCallback(
    (next: readonly Element[]) => {
      commitElements(next, 'Distribute elements');
    },
    [commitElements],
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

  const handleReorderElements = useCallback(
    (next: readonly Element[]) => {
      commitElements(next, 'Reorder elements');
    },
    [commitElements],
  );

  const handleUndoElements = useCallback(
    (restored: readonly Element[]) => {
      const previous = elementsRef.current;
      imageCleanupQueueRef.current?.cancel(collectImageStoragePaths(restored));
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
    if (status !== 'success' || comments === undefined) {
      setWorkspaceComments([]);
      return;
    }

    let active = true;
    comments
      .listWorkspaceComments({ workspaceId })
      .then((response) => {
        if (active) {
          setWorkspaceComments(response.status === 'ok' ? response.comments : []);
        }
      })
      .catch(() => {
        if (active) {
          setWorkspaceComments([]);
        }
      });

    return () => {
      active = false;
    };
  }, [comments, status, workspaceId]);

  const handleCommentSaved = useCallback((comment: Comment): void => {
    setWorkspaceComments((current) => {
      const exists = current.some((entry) => entry.id.equals(comment.id));

      return exists
        ? current.map((entry) => (entry.id.equals(comment.id) ? comment : entry))
        : [...current, comment];
    });
  }, []);

  const unresolvedCommentCounts = useMemo(
    () => countUnresolvedCommentsByElement(workspaceComments),
    [workspaceComments],
  );

  const workspaceName = result?.status === 'ok' ? result.workspace.name : '';

  const handleExportJson = useCallback((): void => {
    if (fileDownload === undefined || workspaceName.length === 0) {
      return;
    }

    try {
      const exportedAt = new Date();
      const boardExport = serializeBoardExport({
        workspaceId,
        exportedAt,
        elements: elementsRef.current,
      });

      fileDownload.downloadTextFile({
        fileName: createBoardExportFileName(workspaceName, exportedAt, 'json'),
        content: boardExportToJson(boardExport),
        mimeType: 'application/json',
      });
      setExportError(null);
    } catch {
      setExportError(t('canvas.export.error'));
    }
  }, [fileDownload, workspaceId, workspaceName, t]);

  const handleExportPdf = useCallback((): void => {
    setExportError(null);
    setPrintRequest(new Date());
  }, []);

  useEffect(() => {
    if (printRequest === null) {
      return;
    }

    const originalTitle = document.title;

    document.title = createBoardExportFileName(workspaceName, printRequest, 'pdf').replace(
      /\.pdf$/,
      '',
    );

    function handleAfterPrint(): void {
      setPrintRequest(null);
    }

    window.addEventListener('afterprint', handleAfterPrint);
    const frame = window.requestAnimationFrame(() => {
      window.print();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.title = originalTitle;
    };
  }, [printRequest, workspaceName]);

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
    if (status !== 'success' || listWorkspaceMembers === undefined) {
      setWorkspaceMembers([]);
      return;
    }

    let active = true;

    void (async () => {
      try {
        const response = await listWorkspaceMembers(workspaceId);
        if (active && response.status === 'ok') {
          setWorkspaceMembers(response.members);
        }
      } catch {
        if (active) {
          setWorkspaceMembers([]);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [listWorkspaceMembers, status, workspaceId]);

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
        <LoadingState label={t('workspaceShell.loadingWorkspace')}>
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
          title={t('workspaceShell.notFoundTitle')}
          titleAs="h1"
          description={t('workspaceShell.notFoundDescription')}
          actionLabel={t('canvas.topbar.back')}
          onAction={onBack}
        />
      </Container>
    );
  }

  if (status === 'error') {
    const errorMessage =
      result?.status === 'error'
        ? localizeMessage(t, describeGetWorkspaceError(result.error))
        : t('common.somethingWentWrong');

    return (
      <Container>
        <ErrorState
          title={t('workspaceShell.loadErrorTitle')}
          titleAs="h1"
          description={errorMessage}
          actionLabel={t('common.retry')}
          onAction={fetchWorkspace}
          secondaryActionLabel={t('canvas.topbar.back')}
          onSecondaryAction={onBack}
        />
      </Container>
    );
  }

  if (result?.status === 'ok') {
    if (elementsStatus === 'loading' || roleStatus === 'loading') {
      return (
        <Container>
          <LoadingState label={t('workspaceShell.loadingBoard')}>
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
          ? t('common.somethingWentWrong')
          : localizeMessage(t, describeLoadWorkspaceElementsError(elementsError));

      return (
        <Container>
          <ErrorState
            title={t('workspaceShell.boardErrorTitle')}
            titleAs="h1"
            description={errorMessage}
            actionLabel={t('common.retry')}
            onAction={fetchElements}
            secondaryActionLabel={t('canvas.topbar.back')}
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

    const canShare =
      localUserId !== undefined &&
      listWorkspaceMembers !== undefined &&
      leaveWorkspace !== undefined &&
      (!permissionsEnforced || role !== undefined);
    const canManageGuestLinks = !permissionsEnforced || permissions.can('workspace:update');

    return (
      <>
        <WorkspaceShellLayout
          workspace={result.workspace}
          elements={elements}
          role={role}
          members={workspaceMembers}
          currentUser={currentUser}
          connectedUsers={connectedUsers}
          logoutUser={logoutUser}
          onBack={onBack}
          canvasViewportStore={canvasViewportStoreRef.current}
          selectionStore={selectionStoreRef.current}
          commandHistory={commandHistoryRef.current}
          onMoveElements={handleMoveElements}
          onResizeElements={handleResizeElements}
          onRotateElements={handleRotateElements}
          onAlignElements={handleAlignElements}
          onDistributeElements={handleDistributeElements}
          onTransformEnd={handleTransformEnd}
          onDeleteElements={handleDeleteElements}
          onDuplicateElements={handleDuplicateElements}
          onPasteElements={handlePasteElements}
          onReorderElements={handleReorderElements}
          onUndoElements={handleUndoElements}
          onRedoElements={handleRedoElements}
          onCreateElement={canCreateElement ? handleCreateElement : undefined}
          onUploadImage={
            canCreateElement && imageServices !== undefined ? handleUploadImage : undefined
          }
          onCreateConnector={canCreateElement ? handleCreateConnector : undefined}
          onCreateTask={canCreateElement ? handleCreateTask : undefined}
          onCreateTaskFromElement={canCreateElement ? handleCreateTaskFromElement : undefined}
          onUpdateElement={canElementWrite ? handleUpdateElement : undefined}
          onUpdateConnectorEndpoint={canElementWrite ? handleUpdateConnectorEndpoint : undefined}
          generateElementId={generateElementId}
          remoteCursors={remoteCursors}
          onCursorMove={cursorBroadcaster === null ? undefined : handleCursorMove}
          syncStatus={syncStatus}
          connectionStatus={connectionStatus}
          persistenceErrorMessage={
            persistenceError === null
              ? null
              : localizeMessage(t, describePersistElementsError(persistenceError))
          }
          collaborationErrorMessage={
            collaborationError === null
              ? null
              : localizeMessage(t, describeCollaborationSyncError(collaborationError))
          }
          creationErrorMessage={
            creationError === null
              ? null
              : localizeMessage(t, describeCreateElementError(creationError))
          }
          readOnly={!canElementWrite}
          accessErrorMessage={
            roleStatus === 'failed'
              ? 'We could not verify your access to this board. It is view-only.'
              : null
          }
          onRetryRole={roleStatus === 'failed' ? handleRetryRole : undefined}
          onShare={canShare ? () => setShareOpen(true) : undefined}
          onExportJson={fileDownload === undefined ? undefined : handleExportJson}
          onExportPdf={fileDownload === undefined ? undefined : handleExportPdf}
          exportErrorMessage={exportError}
          listWorkspaces={listWorkspaces}
          onOpenWorkspace={onOpenWorkspace}
          commentServices={comments}
          unresolvedCommentCounts={unresolvedCommentCounts}
          onCommentSaved={handleCommentSaved}
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
            guestLinks={guestLinks}
            canManageGuestLinks={canManageGuestLinks}
            onLeft={onBack}
          />
        ) : null}
        {printRequest === null ? null : (
          <BoardPrintView
            workspaceName={result.workspace.name}
            elements={elements}
            exportedAt={printRequest}
          />
        )}
      </>
    );
  }

  return null;
}
