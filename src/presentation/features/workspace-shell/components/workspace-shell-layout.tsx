import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Button, Text } from '@raulrod/ui';
import type { Workspace } from '../../../../domain/workspace';
import type { Element, ElementType } from '../../../../domain/element';
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
  readonly onUndoElements: (elements: readonly Element[]) => void;
  readonly onRedoElements: (elements: readonly Element[]) => void;
  readonly onCreateElement?: (type: ElementType) => void;
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
  readonly readOnly?: boolean;
  readonly accessErrorMessage?: string | null;
  readonly onRetryRole?: () => void;
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
  onCreateElement,
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
  readOnly = false,
  accessErrorMessage = null,
  onRetryRole,
}: WorkspaceShellLayoutProps): ReactNode {
  return (
    <Shell>
      <WorkspaceTopBar
        workspace={workspace}
        role={role}
        readOnly={readOnly}
        onBack={onBack}
        syncStatus={syncStatus}
        connectionStatus={connectionStatus}
        connectedUsers={connectedUsers}
        currentUser={currentUser}
        logoutUser={logoutUser}
        onShare={onShare}
        persistenceErrorMessage={persistenceErrorMessage}
        collaborationErrorMessage={collaborationErrorMessage}
        creationErrorMessage={creationErrorMessage}
      />
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
          onCreateElement={onCreateElement}
          generateId={generateElementId}
          remoteCursors={remoteCursors}
          onCursorMove={onCursorMove}
          readOnly={readOnly}
        />
      </CanvasArea>
    </Shell>
  );
}
