import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import styled from 'styled-components';
import { Button, Text } from '@raulrod/ui';
import type { Workspace } from '../../../../domain/workspace';
import type { Comment } from '../../../../domain/comment';
import type { Element, ElementType } from '../../../../domain/element';
import type { ElementId, Position } from '../../../../domain/shared';
import type { MembershipRole } from '../../../../domain/membership';
import type { Membership } from '../../../../domain/membership';
import type { Presence } from '../../../../domain/collaboration';
import type { LogoutUser, UpdateElementInput } from '../../../../application/commands';
import type { ListWorkspaces } from '../../../../application/queries';
import { connectorCandidateIds, selectPresentationFrames } from '../../../../application/services';
import type {
  CanvasViewportStore,
  CommandHistory,
  PersistenceSyncStatus,
  RemoteCursor,
  SelectionStore,
} from '../../../../application/services';
import type { AuthUser, RealtimeConnectionStatus } from '../../../../application/ports';
import type { CommentServices } from '../../../../application/comment-services';
import {
  createPresenceColorAssigner,
  presenceLabel,
  shortUserId,
  userLabel,
} from '../../../collaboration';
import { Canvas, type CanvasCommandHandle, type ConnectorEndpointDragInput } from '../../../canvas';
import type {
  TaskAssigneeOption,
  TaskFormValues,
} from '../../../canvas/components/task-form-dialog';
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog';
import { CommentsPanel } from './comments-panel';
import { BoardPresentation } from './board-presentation';
import { TaskPlanPanel } from './task-plan-panel';
import { WorkspaceCommandPalette } from './workspace-command-palette';
import { WorkspaceTopBar } from './workspace-top-bar';
import type { CommentTarget } from './workspace-shell-container';

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100dvh;
`;

const AccessBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[3]} ${({ theme }) => theme.space[4]};
  background: ${({ theme }) => theme.color.background.warning};
  border-bottom: 1px solid ${({ theme }) => theme.color.border.default};
`;

const CanvasArea = styled.main`
  flex: 1 1 auto;
  display: flex;
  min-height: 0;
  background: ${({ theme }) => theme.canvas.board};
`;

const CanvasRegion = styled.div`
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
`;

export interface WorkspaceShellLayoutProps {
  readonly workspace: Workspace;
  readonly elements: readonly Element[];
  readonly role: MembershipRole | undefined;
  readonly members?: readonly Membership[];
  readonly currentUser: AuthUser | null;
  readonly logoutUser: LogoutUser;
  readonly onBack: () => void;
  readonly canvasViewportStore: CanvasViewportStore;
  readonly selectionStore: SelectionStore;
  readonly commandHistory: CommandHistory<readonly Element[]>;
  readonly onMoveElements: (elements: readonly Element[]) => void;
  readonly onResizeElements: (elements: readonly Element[]) => void;
  readonly onRotateElements: (elements: readonly Element[]) => void;
  readonly onAlignElements?: (elements: readonly Element[]) => void;
  readonly onDistributeElements?: (elements: readonly Element[]) => void;
  readonly onTransformEnd: () => void;
  readonly onDeleteElements: (elements: readonly Element[]) => void;
  readonly onDuplicateElements: (
    elements: readonly Element[],
    duplicatedIds: readonly string[],
  ) => void;
  readonly onPasteElements: (elements: readonly Element[], pastedIds: readonly string[]) => void;
  readonly onReorderElements: (elements: readonly Element[]) => void;
  readonly onUndoElements: (elements: readonly Element[]) => void;
  readonly onRedoElements: (elements: readonly Element[]) => void;
  readonly onCreateElement?: (type: ElementType) => ElementId | void;
  readonly onUploadImage?: (
    file: File,
    position?: Position,
  ) => Promise<ElementId | void> | ElementId | void;
  readonly onPasteText?: (text: string, position?: Position) => ElementId | void;
  readonly onCreateConnector?: (mode: 'free' | 'bound') => ElementId | void;
  readonly onCreateTask?: (values: TaskFormValues) => ElementId | void;
  readonly onCreateTaskFromElement?: (element: Element) => ElementId | void;
  readonly onUpdateElement?: (input: UpdateElementInput) => void;
  readonly onUpdateConnectorEndpoint?: (input: ConnectorEndpointDragInput) => void;
  readonly generateElementId: () => ElementId;
  readonly remoteCursors: readonly RemoteCursor[];
  readonly connectedUsers: readonly Presence[];
  readonly onCursorMove?: (position: Position) => void;
  readonly syncStatus: PersistenceSyncStatus;
  readonly connectionStatus: RealtimeConnectionStatus;
  readonly persistenceErrorMessage: string | null;
  readonly collaborationErrorMessage: string | null;
  readonly creationErrorMessage: string | null;
  readonly onShare?: () => void;
  readonly onExportJson?: () => void;
  readonly onExportPdf?: () => void;
  readonly exportErrorMessage?: string | null;
  readonly readOnly?: boolean;
  readonly accessErrorMessage?: string | null;
  readonly onRetryRole?: () => void;
  readonly listWorkspaces?: ListWorkspaces;
  readonly onOpenWorkspace?: (workspaceId: string) => void;
  readonly commentServices?: CommentServices;
  readonly currentUserName?: string;
  readonly commentTarget?: CommentTarget | null;
  readonly onCommentTargetHandled?: () => void;
  readonly elementsReady?: boolean;
  readonly unresolvedCommentCounts?: ReadonlyMap<string, number>;
  readonly onCommentSaved?: (comment: Comment) => void;
}

export function WorkspaceShellLayout({
  workspace,
  elements,
  role,
  members = [],
  currentUser,
  logoutUser,
  onBack,
  canvasViewportStore,
  selectionStore,
  commandHistory,
  onMoveElements,
  onResizeElements,
  onRotateElements,
  onAlignElements,
  onDistributeElements,
  onTransformEnd,
  onDeleteElements,
  onDuplicateElements,
  onPasteElements,
  onReorderElements,
  onUndoElements,
  onRedoElements,
  onCreateElement,
  onUploadImage,
  onPasteText,
  onCreateConnector,
  onCreateTask,
  onCreateTaskFromElement,
  onUpdateElement,
  onUpdateConnectorEndpoint,
  generateElementId,
  remoteCursors,
  connectedUsers,
  onCursorMove,
  syncStatus,
  connectionStatus,
  persistenceErrorMessage,
  collaborationErrorMessage,
  creationErrorMessage,
  onShare,
  onExportJson,
  onExportPdf,
  exportErrorMessage = null,
  readOnly = false,
  accessErrorMessage = null,
  onRetryRole,
  listWorkspaces,
  onOpenWorkspace,
  commentServices,
  currentUserName,
  commentTarget = null,
  onCommentTargetHandled,
  elementsReady = false,
  unresolvedCommentCounts,
  onCommentSaved,
}: WorkspaceShellLayoutProps): ReactNode {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const commandRef = useRef<CanvasCommandHandle | null>(null);
  const selection = useSyncExternalStore(selectionStore.subscribe, selectionStore.getSnapshot);
  const colorAssignerRef = useRef(createPresenceColorAssigner());
  const userIds = useMemo(() => {
    const ids = new Set<string>();

    for (const presence of connectedUsers) {
      ids.add(presence.userId.value);
    }
    for (const cursor of remoteCursors) {
      ids.add(cursor.userId);
    }

    return [...ids].sort((left, right) => left.localeCompare(right));
  }, [connectedUsers, remoteCursors]);
  const userColors = useMemo(() => {
    const colors = new Map<string, string>();

    for (const userId of userIds) {
      colors.set(userId, colorAssignerRef.current.colorFor(userId));
    }

    return colors;
  }, [userIds]);

  const assignees = useMemo<readonly TaskAssigneeOption[]>(() => {
    const options = new Map<string, TaskAssigneeOption>();
    const connectedLabels = new Map(
      connectedUsers.map((presence) => [presence.userId.value, presenceLabel(presence)]),
    );

    for (const member of members) {
      const userId = member.userId.value;
      options.set(userId, {
        userId,
        label:
          currentUser?.uid === userId
            ? userLabel(currentUser.displayName, userId)
            : (connectedLabels.get(userId) ?? shortUserId(userId)),
      });
    }

    if (currentUser !== null && !options.has(currentUser.uid)) {
      options.set(currentUser.uid, {
        userId: currentUser.uid,
        label: userLabel(currentUser.displayName, currentUser.uid),
      });
    }

    return [...options.values()].sort((left, right) => left.label.localeCompare(right.label));
  }, [connectedUsers, currentUser, members]);

  const selectedElement = useMemo(() => {
    if (selection.selectedIds.length !== 1) {
      return undefined;
    }

    const selectedId = selection.selectedIds[0];
    return elements.find((element) => element.id.value === selectedId);
  }, [elements, selection.selectedIds]);
  const authorLabels = useMemo(
    () => new Map(assignees.map((assignee) => [assignee.userId, assignee.label])),
    [assignees],
  );

  const canCreate = !readOnly && onCreateElement !== undefined;
  const canCreateTask = !readOnly && (onCreateTask !== undefined || onCreateElement !== undefined);
  const canCreateFreeConnector = !readOnly && onCreateConnector !== undefined;
  const canConnectSelected =
    canCreateFreeConnector && connectorCandidateIds(elements, selection.selectedIds) !== null;
  const canUndo = !readOnly && commandHistory.canUndo();
  const canRedo = !readOnly && commandHistory.canRedo();
  const togglePlan = (): void => {
    setCommentsOpen(false);
    setPlanOpen((open) => !open);
  };
  const toggleComments = (): void => {
    setPlanOpen(false);
    setCommentsOpen((open) => !open);
  };
  const canComment = commentServices !== undefined && currentUser !== null;

  const [presentedFrameId, setPresentedFrameId] = useState<string | null>(null);
  const canvasRegionRef = useRef<HTMLDivElement | null>(null);
  const wasPresentingRef = useRef(false);
  const presentationFrames = useMemo(() => selectPresentationFrames(elements), [elements]);
  const presentedIndex =
    presentedFrameId === null
      ? -1
      : presentationFrames.findIndex((frame) => frame.id.value === presentedFrameId);
  const presentedFrame = presentedIndex >= 0 ? presentationFrames[presentedIndex] : undefined;
  const presenting = presentedFrame !== undefined;

  useEffect(() => {
    if (presentedFrameId !== null && presentedIndex === -1) {
      setPresentedFrameId(null);
    }
  }, [presentedFrameId, presentedIndex]);

  useEffect(() => {
    if (commentTarget === null || !elementsReady || presenting) {
      return;
    }

    const element = elements.find((entry) => entry.id.value === commentTarget.elementId);
    if (element === undefined) {
      onCommentTargetHandled?.();
      return;
    }

    selectionStore.select(element.id.value);
    setPlanOpen(false);
    setCommentsOpen(true);
    onCommentTargetHandled?.();
  }, [commentTarget, elements, elementsReady, onCommentTargetHandled, presenting, selectionStore]);

  useEffect(() => {
    const wasPresenting = wasPresentingRef.current;
    wasPresentingRef.current = presenting;

    if (wasPresenting && !presenting) {
      canvasRegionRef.current
        ?.querySelector<HTMLElement>('[role="application"]')
        ?.focus({ preventScroll: true });
    }
  }, [presenting]);

  const startPresentation = (): void => {
    const firstFrame = presentationFrames[0];

    if (firstFrame === undefined) {
      return;
    }

    setPlanOpen(false);
    setCommentsOpen(false);
    setShortcutsOpen(false);
    setCommandPaletteOpen(false);
    selectionStore.clear();
    setPresentedFrameId(firstFrame.id.value);
  };

  const exitPresentation = (): void => {
    setPresentedFrameId(null);
  };

  const showPreviousFrame = (): void => {
    const previousFrame = presentationFrames[presentedIndex - 1];

    if (previousFrame !== undefined) {
      setPresentedFrameId(previousFrame.id.value);
    }
  };

  const showNextFrame = (): void => {
    const nextFrame = presentationFrames[presentedIndex + 1];

    if (nextFrame !== undefined) {
      setPresentedFrameId(nextFrame.id.value);
    }
  };

  return (
    <Shell>
      {accessErrorMessage === null ? null : (
        <AccessBanner role="alert">
          <Text color="color.text.primary">{accessErrorMessage}</Text>
          {onRetryRole === undefined ? null : (
            <Button type="button" variant="outline" size="sm" onClick={onRetryRole}>
              Retry
            </Button>
          )}
        </AccessBanner>
      )}
      <CanvasArea id="main-content" tabIndex={-1}>
        <CanvasRegion ref={canvasRegionRef}>
          {presenting ? null : (
            <WorkspaceTopBar
              workspace={workspace}
              role={role}
              readOnly={readOnly}
              onBack={onBack}
              syncStatus={syncStatus}
              connectionStatus={connectionStatus}
              connectedUsers={connectedUsers}
              userColors={userColors}
              currentUser={currentUser}
              logoutUser={logoutUser}
              onShare={onShare}
              planOpen={planOpen}
              onTogglePlan={togglePlan}
              commentsOpen={commentsOpen}
              onToggleComments={canComment ? toggleComments : undefined}
              onShowShortcuts={() => setShortcutsOpen(true)}
              onExportJson={onExportJson}
              onExportPdf={onExportPdf}
              onPresent={startPresentation}
              canPresent={presentationFrames.length > 0}
              persistenceErrorMessage={persistenceErrorMessage}
              collaborationErrorMessage={collaborationErrorMessage}
              creationErrorMessage={creationErrorMessage}
              exportErrorMessage={exportErrorMessage}
            />
          )}
          <Canvas
            store={canvasViewportStore}
            selectionStore={selectionStore}
            elements={elements}
            history={commandHistory}
            onMoveElements={onMoveElements}
            onResizeElements={onResizeElements}
            onRotateElements={onRotateElements}
            onAlignElements={onAlignElements}
            onDistributeElements={onDistributeElements}
            onTransformEnd={onTransformEnd}
            onDeleteElements={onDeleteElements}
            onDuplicateElements={onDuplicateElements}
            onPasteElements={onPasteElements}
            onReorderElements={onReorderElements}
            onUndoElements={onUndoElements}
            onRedoElements={onRedoElements}
            onCreateElement={onCreateElement}
            onUploadImage={onUploadImage}
            onPasteText={onPasteText}
            onCreateConnector={onCreateConnector}
            onCreateTask={onCreateTask}
            onCreateTaskFromElement={onCreateTaskFromElement}
            assignees={assignees}
            onUpdateElement={onUpdateElement}
            onUpdateConnectorEndpoint={onUpdateConnectorEndpoint}
            generateId={generateElementId}
            remoteCursors={remoteCursors}
            userColors={userColors}
            onCursorMove={onCursorMove}
            readOnly={readOnly || presenting}
            presentation={presenting}
            commandRef={commandRef}
            unresolvedCommentCounts={canComment ? unresolvedCommentCounts : undefined}
            onOpenComments={
              canComment
                ? () => {
                    setPlanOpen(false);
                    setCommentsOpen(true);
                  }
                : undefined
            }
          />
          {presentedFrame === undefined ? null : (
            <BoardPresentation
              frame={presentedFrame}
              index={presentedIndex}
              total={presentationFrames.length}
              store={canvasViewportStore}
              onPrevious={showPreviousFrame}
              onNext={showNextFrame}
              onExit={exitPresentation}
            />
          )}
        </CanvasRegion>
      </CanvasArea>
      <TaskPlanPanel
        open={planOpen && !presenting}
        elements={elements}
        currentUserId={currentUser?.uid}
        assignees={assignees}
        canEdit={!readOnly && onUpdateElement !== undefined}
        canCreateTask={canCreateTask}
        onClose={() => setPlanOpen(false)}
        onSelectTask={(elementId) => commandRef.current?.focusElement(elementId)}
        onChangeStatus={(task, status) => {
          onUpdateElement?.({ type: 'task', element: task, status });
        }}
        onCreateTask={() => commandRef.current?.createElement('task')}
      />
      <CommentsPanel
        open={commentsOpen && canComment && !presenting}
        workspaceId={workspace.id.value}
        element={selectedElement}
        currentUserId={currentUser?.uid}
        authorLabels={authorLabels}
        services={commentServices}
        currentUserName={currentUserName}
        highlightCommentId={commentTarget?.commentId}
        onCommentSaved={onCommentSaved}
        onClose={() => setCommentsOpen(false)}
      />
      {presenting ? null : (
        <>
          <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
          <WorkspaceCommandPalette
            open={commandPaletteOpen}
            onOpenChange={setCommandPaletteOpen}
            workspaceId={workspace.id.value}
            elements={elements}
            commandRef={commandRef}
            canCreate={canCreate}
            canCreateFreeConnector={canCreateFreeConnector}
            canConnectSelected={canConnectSelected}
            canUndo={canUndo}
            canRedo={canRedo}
            onShare={onShare}
            onShowShortcuts={() => setShortcutsOpen(true)}
            onBack={onBack}
            userId={currentUser?.uid}
            listWorkspaces={listWorkspaces}
            onOpenWorkspace={onOpenWorkspace}
          />
        </>
      )}
    </Shell>
  );
}
