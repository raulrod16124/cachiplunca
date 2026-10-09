import { Button, Heading, Inline, Text } from '@raulrod/ui';
import { ArrowLeft } from '@raulrod/icons';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { Workspace } from '../../../../domain/workspace';
import { SignOutButton } from '../../auth/sign-out-button';
import type { LogoutUser } from '../../../../application/commands';
import type { CanvasViewportStore, SelectionStore } from '../../../../application/services';
import { Canvas } from '../../../canvas';

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
  readonly logoutUser: LogoutUser;
  readonly onBack: () => void;
  readonly canvasViewportStore: CanvasViewportStore;
  readonly selectionStore: SelectionStore;
}

export function WorkspaceShellLayout({
  workspace,
  logoutUser,
  onBack,
  canvasViewportStore,
  selectionStore,
}: WorkspaceShellLayoutProps): ReactNode {
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
          </Inline>
          <SignOutButton logoutUser={logoutUser} />
        </Inline>
      </Header>
      <CanvasArea>
        <Canvas store={canvasViewportStore} selectionStore={selectionStore} />
      </CanvasArea>
    </Shell>
  );
}
