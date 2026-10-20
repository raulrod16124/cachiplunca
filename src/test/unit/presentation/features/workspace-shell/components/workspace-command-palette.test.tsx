import { createRef } from 'react';
import { render, screen } from '../../../../../setup/render-with-theme';
import type { CanvasCommandHandle } from '../../../../../../presentation/canvas';
import { WorkspaceCommandPalette } from '../../../../../../presentation/features/workspace-shell/components/workspace-command-palette';

const COMMAND_REF = createRef<CanvasCommandHandle>();

interface RenderOptions {
  readonly canCreate?: boolean;
  readonly canCreateFreeConnector?: boolean;
  readonly canConnectSelected?: boolean;
  readonly canUndo?: boolean;
  readonly canRedo?: boolean;
}

function renderPalette({
  canCreate = false,
  canCreateFreeConnector = false,
  canConnectSelected = false,
  canUndo = false,
  canRedo = false,
}: RenderOptions = {}) {
  render(
    <WorkspaceCommandPalette
      open
      onOpenChange={jest.fn()}
      workspaceId="ws-1"
      elements={[]}
      commandRef={COMMAND_REF}
      canCreate={canCreate}
      canCreateFreeConnector={canCreateFreeConnector}
      canConnectSelected={canConnectSelected}
      canUndo={canUndo}
      canRedo={canRedo}
      onBack={jest.fn()}
      userId={undefined}
      listWorkspaces={undefined}
    />,
  );
}

describe('WorkspaceCommandPalette', () => {
  it('hides write actions and shows undo/redo as explicitly disabled when unavailable', () => {
    renderPalette();

    expect(screen.queryByTestId('command-palette-item-create-text')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('command-palette-item-create-connector-free'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('command-palette-item-create-connector-bound'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('command-palette-item-undo')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByTestId('command-palette-item-redo')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByTestId('command-palette-item-back-to-workspaces')).toBeInTheDocument();
  });

  it('lists element creation, free connectors and connecting a selection when available', () => {
    renderPalette({
      canCreate: true,
      canCreateFreeConnector: true,
      canConnectSelected: true,
      canUndo: true,
      canRedo: true,
    });

    expect(screen.getByTestId('command-palette-item-create-text')).toBeInTheDocument();
    expect(screen.getByTestId('command-palette-item-create-note')).toBeInTheDocument();
    expect(screen.getByTestId('command-palette-item-create-task')).toBeInTheDocument();
    expect(screen.getByTestId('command-palette-item-create-frame')).toBeInTheDocument();
    expect(screen.getByTestId('command-palette-item-create-link')).toBeInTheDocument();
    expect(screen.getByTestId('command-palette-item-create-connector-free')).toBeInTheDocument();
    expect(screen.getByTestId('command-palette-item-create-connector-bound')).toBeInTheDocument();
    expect(screen.getByTestId('command-palette-item-undo')).not.toHaveAttribute('aria-disabled');
  });
});
