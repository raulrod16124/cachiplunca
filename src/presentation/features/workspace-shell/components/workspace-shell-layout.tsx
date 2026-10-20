import type { ReactNode } from 'react';
import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import styled from 'styled-components';
import { Button, Text } from '@raulrod/ui';
import type { Workspace } from '../../../../domain/workspace';
import type { Element, ElementType } from '../../../../domain/element';
import type { ElementId, Position } from '../../../../domain/shared';
import type { MembershipRole } from '../../../../domain/membership';
import type { Presence } from '../../../../domain/collaboration';
import type {
  LogoutUser,
  UpdateElementInput,
  UpdateWorkspaceResult,
} from '../../../../application/commands';
import type { ListWorkspaces } from '../../../../application/queries';
import { connectorCandidateIds } from '../../../../application/services';
import type {
  CanvasViewportStore,
  CommandHistory,
  PersistenceSyncStatus,
  RemoteCursor,
  SelectionStore,
} from '../../../../application/services';
import type { AuthUser, RealtimeConnectionStatus } from '../../../../application/ports';
import { createPresenceColorAssigner } from '../../../collaboration';
import { Canvas, type CanvasCommandHandle, type ConnectorEndpointDragInput } from '../../../canvas';
import type { TaskFormValues } from '../../../canvas/components/task-form-dialog';
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog';
import { WorkspaceCommandPalette } from './workspace-command-palette';
import { WorkspaceTopBar } from './workspace-top-bar';

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
  background: ${({ theme }) => theme.canvas.surface};
  position: relative;
  overflow: hidden;
`;

export interface WorkspaceShellLayoutProps {
  readonly workspace: Workspace;
  readonly elements: readonly Element[];
  readonly role: MembershipRole | undefined;
  readonly currentUser: AuthUser | null;
  readonly logoutUser: LogoutUser;
  readonly onBack: () => void;
  readonly canvasViewportStore: CanvasViewportStore;
  readonly selectionStore: SelectionStore;
  readonly commandHistory: CommandHistory<readonly Element[]>;
  readonly onMoveElements: (elements: readonly Element[]) => void;
  readonly onResizeElements: (elements: readonly Element[]) => void;
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
  readonly onCreateConnector?: (mode: 'free' | 'bound') => ElementId | void;
  readonly onCreateTask?: (values: TaskFormValues) => ElementId | void;
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
  readonly onRename?: (name: string) => Promise<UpdateWorkspaceResult>;
  readonly readOnly?: boolean;
  readonly accessErrorMessage?: string | null;
  readonly onRetryRole?: () => void;
  readonly listWorkspaces?: ListWorkspaces;
  readonly onOpenWorkspace?: (workspaceId: string) => void;
}

export function WorkspaceShellLayout({
  workspace,
  elements,
  role,
  currentUser,
  logoutUser,
  onBack,
  canvasViewportStore,
  selectionStore,
  commandHistory,
  onMoveElements,
  onResizeElements,
  onTransformEnd,
  onDeleteElements,
  onDuplicateElements,
  onPasteElements,
  onReorderElements,
  onUndoElements,
  onRedoElements,
  onCreateElement,
  onCreateConnector,
  onCreateTask,
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
  onRename,
  readOnly = false,
  accessErrorMessage = null,
  onRetryRole,
  listWorkspaces,
  onOpenWorkspace,
}: WorkspaceShellLayoutProps): ReactNode {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
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

  const canCreate = !readOnly && onCreateElement !== undefined;
  const canCreateFreeConnector = !readOnly && onCreateConnector !== undefined;
  const canConnectSelected =
    canCreateFreeConnector && connectorCandidateIds(elements, selection.selectedIds) !== null;
  const canUndo = !readOnly && commandHistory.canUndo();
  const canRedo = !readOnly && commandHistory.canRedo();

  return (
    <Shell>
      {accessErrorMessage === null ? null : (
        <AccessBanner role="alert">
          <Text color="color.text.primary">{accessErrorMessage}</Text>
          {onRetryRole === undefined ? null : (
            <Button type="button" variant="secondary" size="sm" onClick={onRetryRole}>
              Retry
            </Button>
          )}
        </AccessBanner>
      )}
      <CanvasArea>
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
          onShowShortcuts={() => setShortcutsOpen(true)}
          onExportJson={onExportJson}
          onExportPdf={onExportPdf}
          onRename={onRename}
          persistenceErrorMessage={persistenceErrorMessage}
          collaborationErrorMessage={collaborationErrorMessage}
          creationErrorMessage={creationErrorMessage}
          exportErrorMessage={exportErrorMessage}
        />
        <Canvas
          store={canvasViewportStore}
          selectionStore={selectionStore}
          elements={elements}
          history={commandHistory}
          onMoveElements={onMoveElements}
          onResizeElements={onResizeElements}
          onTransformEnd={onTransformEnd}
          onDeleteElements={onDeleteElements}
          onDuplicateElements={onDuplicateElements}
          onPasteElements={onPasteElements}
          onReorderElements={onReorderElements}
          onUndoElements={onUndoElements}
          onRedoElements={onRedoElements}
          onCreateElement={onCreateElement}
          onCreateConnector={onCreateConnector}
          onCreateTask={onCreateTask}
          onUpdateElement={onUpdateElement}
          onUpdateConnectorEndpoint={onUpdateConnectorEndpoint}
          generateId={generateElementId}
          remoteCursors={remoteCursors}
          userColors={userColors}
          onCursorMove={onCursorMove}
          readOnly={readOnly}
          commandRef={commandRef}
        />
      </CanvasArea>
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
    </Shell>
  );
}
