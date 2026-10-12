import { Badge, Button, Heading, Inline, Text } from '@raulrod/ui';
import { ArrowLeft } from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { Workspace } from '../../../../domain/workspace';
import type { Element } from '../../../../domain/element';
import type { ElementId } from '../../../../domain/shared';
import { SignOutButton } from '../../auth/sign-out-button';
import type { LogoutUser } from '../../../../application/commands';
import type {
  CanvasViewportStore,
  CommandHistory,
  PersistenceSyncStatus,
  SelectionStore,
} from '../../../../application/services';
import { Canvas } from '../../../canvas';
import { describeSyncStatus } from '../workspace-sync-status';

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
`;

const Header = styled.header`
  border-bottom: 1px solid var(--rr-color-border-default, #e2e8f0);
  padding: 12px 24px;
`;

const CanvasArea = styled.main`
  flex: 1 1 auto;
  background: var(--rr-color-background-default, #f8fafc);
  position: relative;
  overflow: hidden;
`;

export interface WorkspaceShellLayoutProps {
  readonly workspace: Workspace;
  readonly elements: readonly Element[];
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
  readonly syncStatus: PersistenceSyncStatus;
  readonly persistenceErrorMessage: string | null;
  readonly collaborationErrorMessage: string | null;
}

export function WorkspaceShellLayout({
  workspace,
  elements,
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
  syncStatus,
  persistenceErrorMessage,
  collaborationErrorMessage,
}: WorkspaceShellLayoutProps): ReactNode {
  const syncBadge = describeSyncStatus(syncStatus);

  return (
    <Shell>
      <Header>
        <Inline justify="between" align="center" wrap gap="space-3">
          <Inline gap="space-3" align="center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              aria-label="Back to workspaces"
            >
              <Inline gap="space-2" align="center">
                <ArrowLeft aria-hidden="true" size={16} />
                <Text>Workspaces</Text>
              </Inline>
            </Button>
            <Heading as="h1">{workspace.name}</Heading>
            {syncBadge === null ? null : (
              <span role="status" aria-live="polite">
                <Badge variant={syncBadge.variant}>{syncBadge.label}</Badge>
              </span>
            )}
          </Inline>
          <SignOutButton logoutUser={logoutUser} />
        </Inline>
        {persistenceErrorMessage === null ? null : (
          <Text role="alert" color="color.text.danger">
            {persistenceErrorMessage}
          </Text>
        )}
        {collaborationErrorMessage === null ? null : (
          <Text role="alert" color="color.text.danger">
            {collaborationErrorMessage}
          </Text>
        )}
      </Header>
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
        />
      </CanvasArea>
    </Shell>
  );
}
