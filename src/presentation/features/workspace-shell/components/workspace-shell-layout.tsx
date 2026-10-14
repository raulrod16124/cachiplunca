import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { Workspace } from '../../../../domain/workspace';
import type { Element } from '../../../../domain/element';
import type { ElementId, Position } from '../../../../domain/shared';
import type { MembershipRole } from '../../../../domain/membership';
import type { Presence } from '../../../../domain/collaboration';
import type { LogoutUser } from '../../../../application/commands';
import type {
  CanvasViewportStore,
  CommandHistory,
  PersistenceSyncStatus,
  RemoteCursor,
  SelectionStore,
} from '../../../../application/services';
import type { AuthUser, RealtimeConnectionStatus } from '../../../../application/ports';
import { Canvas } from '../../../canvas';
import { WorkspaceTopBar } from './workspace-top-bar';

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
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
  readonly onUndoElements: (elements: readonly Element[]) => void;
  readonly onRedoElements: (elements: readonly Element[]) => void;
  readonly generateElementId: () => ElementId;
  readonly remoteCursors: readonly RemoteCursor[];
  readonly connectedUsers: readonly Presence[];
  readonly onCursorMove?: (position: Position) => void;
  readonly syncStatus: PersistenceSyncStatus;
  readonly connectionStatus: RealtimeConnectionStatus;
  readonly persistenceErrorMessage: string | null;
  readonly collaborationErrorMessage: string | null;
  readonly onInvite?: () => void;
  readonly readOnly?: boolean;
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
  onUndoElements,
  onRedoElements,
  generateElementId,
  remoteCursors,
  connectedUsers,
  onCursorMove,
  syncStatus,
  connectionStatus,
  persistenceErrorMessage,
  collaborationErrorMessage,
  onInvite,
  readOnly = false,
}: WorkspaceShellLayoutProps): ReactNode {
  return (
    <Shell>
      <WorkspaceTopBar
        workspace={workspace}
        role={role}
        onBack={onBack}
        syncStatus={syncStatus}
        connectionStatus={connectionStatus}
        connectedUsers={connectedUsers}
        currentUser={currentUser}
        logoutUser={logoutUser}
        onInvite={onInvite}
        persistenceErrorMessage={persistenceErrorMessage}
        collaborationErrorMessage={collaborationErrorMessage}
      />
      <CanvasArea>
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
          onUndoElements={onUndoElements}
          onRedoElements={onRedoElements}
          generateId={generateElementId}
          remoteCursors={remoteCursors}
          onCursorMove={onCursorMove}
          readOnly={readOnly}
        />
      </CanvasArea>
    </Shell>
  );
}
