import { fireEvent, screen, waitFor } from '@testing-library/react';
import { render } from '../../../../../setup/render-with-theme';
import type { LogoutUser } from '../../../../../../application/commands';
import type { AuthUser } from '../../../../../../application/ports';
import { Presence } from '../../../../../../domain/collaboration';
import { UserId, WorkspaceId } from '../../../../../../domain/shared';
import { Workspace } from '../../../../../../domain/workspace';
import { WorkspaceTopBar } from '../../../../../../presentation/features/workspace-shell/components/workspace-top-bar';

const CREATED_BY = UserId.create('user-1');

const WORKSPACE = Workspace.create({
  id: WorkspaceId.create('ws-1'),
  name: 'Roadmap Q4',
  createdBy: CREATED_BY,
});

const CURRENT_USER: AuthUser = {
  uid: 'user-1',
  email: 'ada@example.com',
  emailVerified: true,
  displayName: 'Ada Lovelace',
};

const LOGOUT_USER: LogoutUser = jest.fn(async () => ({ status: 'ok' as const }));

function presenceOf(userId: string): Presence {
  return Presence.create({
    userId: UserId.create(userId),
    workspaceId: WorkspaceId.create('ws-1'),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('WorkspaceTopBar', () => {
  it('renders the workspace identity, back action and role badge', () => {
    render(
      <WorkspaceTopBar
        workspace={WORKSPACE}
        role="editor"
        onBack={jest.fn()}
        syncStatus="idle"
        connectionStatus="connected"
        connectedUsers={[]}
        currentUser={CURRENT_USER}
        logoutUser={LOGOUT_USER}
        persistenceErrorMessage={null}
        collaborationErrorMessage={null}
        creationErrorMessage={null}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Roadmap Q4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to workspaces' })).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
  });

  it('surfaces persistence and connection status as live badges', () => {
    render(
      <WorkspaceTopBar
        workspace={WORKSPACE}
        role={undefined}
        onBack={jest.fn()}
        syncStatus="saving"
        connectionStatus="reconnecting"
        connectedUsers={[]}
        currentUser={CURRENT_USER}
        logoutUser={LOGOUT_USER}
        persistenceErrorMessage={null}
        collaborationErrorMessage={null}
        creationErrorMessage={null}
      />,
    );

    expect(screen.getByText('Saving…')).toBeInTheDocument();
    expect(screen.getByText('Reconnecting…')).toBeInTheDocument();
  });

  it('summarises connected collaborators', () => {
    render(
      <WorkspaceTopBar
        workspace={WORKSPACE}
        role={undefined}
        onBack={jest.fn()}
        syncStatus="idle"
        connectionStatus="connected"
        connectedUsers={[presenceOf('user-2'), presenceOf('user-3')]}
        currentUser={CURRENT_USER}
        logoutUser={LOGOUT_USER}
        persistenceErrorMessage={null}
        collaborationErrorMessage={null}
        creationErrorMessage={null}
      />,
    );

    expect(screen.getByTestId('connected-users')).toBeInTheDocument();
    expect(screen.getByText('2 connected')).toBeInTheDocument();
  });

  it('hides the presence summary when nobody else is connected', () => {
    render(
      <WorkspaceTopBar
        workspace={WORKSPACE}
        role={undefined}
        onBack={jest.fn()}
        syncStatus="idle"
        connectionStatus="connected"
        connectedUsers={[]}
        currentUser={CURRENT_USER}
        logoutUser={LOGOUT_USER}
        persistenceErrorMessage={null}
        collaborationErrorMessage={null}
        creationErrorMessage={null}
      />,
    );

    expect(screen.queryByTestId('connected-users')).not.toBeInTheDocument();
  });

  it('shows the share action only when a handler is provided', () => {
    const onShare = jest.fn();
    const { unmount } = render(
      <WorkspaceTopBar
        workspace={WORKSPACE}
        role={undefined}
        onBack={jest.fn()}
        syncStatus="idle"
        connectionStatus="connected"
        connectedUsers={[]}
        currentUser={CURRENT_USER}
        logoutUser={LOGOUT_USER}
        onShare={onShare}
        persistenceErrorMessage={null}
        collaborationErrorMessage={null}
        creationErrorMessage={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(onShare).toHaveBeenCalledTimes(1);
    unmount();

    render(
      <WorkspaceTopBar
        workspace={WORKSPACE}
        role={undefined}
        onBack={jest.fn()}
        syncStatus="idle"
        connectionStatus="connected"
        connectedUsers={[]}
        currentUser={CURRENT_USER}
        logoutUser={LOGOUT_USER}
        persistenceErrorMessage={null}
        collaborationErrorMessage={null}
        creationErrorMessage={null}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  });

  it('announces persistence and collaboration errors', () => {
    render(
      <WorkspaceTopBar
        workspace={WORKSPACE}
        role={undefined}
        onBack={jest.fn()}
        syncStatus="idle"
        connectionStatus="connected"
        connectedUsers={[]}
        currentUser={CURRENT_USER}
        logoutUser={LOGOUT_USER}
        persistenceErrorMessage="Not saved."
        collaborationErrorMessage="Out of sync."
        creationErrorMessage={null}
      />,
    );

    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(screen.getByText('Not saved.')).toBeInTheDocument();
    expect(screen.getByText('Out of sync.')).toBeInTheDocument();
  });

  it('exposes the account menu that signs out', async () => {
    render(
      <WorkspaceTopBar
        workspace={WORKSPACE}
        role={undefined}
        onBack={jest.fn()}
        syncStatus="idle"
        connectionStatus="connected"
        connectedUsers={[]}
        currentUser={CURRENT_USER}
        logoutUser={LOGOUT_USER}
        persistenceErrorMessage={null}
        collaborationErrorMessage={null}
        creationErrorMessage={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => expect(LOGOUT_USER).toHaveBeenCalledTimes(1));
  });
});
