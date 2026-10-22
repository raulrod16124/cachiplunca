import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render as renderWithTheme } from '../../../../../setup/render-with-theme';
import type { LogoutUser } from '../../../../../../application/commands';
import type { AuthUser } from '../../../../../../application/ports';
import { Presence } from '../../../../../../domain/collaboration';
import { UserId, WorkspaceId } from '../../../../../../domain/shared';
import { Workspace } from '../../../../../../domain/workspace';
import { WorkspaceTopBar } from '../../../../../../presentation/features/workspace-shell/components/workspace-top-bar';

function render(ui: ReactElement): ReturnType<typeof renderWithTheme> {
  return renderWithTheme(<MemoryRouter initialEntries={['/workspaces/ws-1']}>{ui}</MemoryRouter>);
}

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

function presenceOf(userId: string, displayName: string | null = null): Presence {
  return Presence.create({
    userId: UserId.create(userId),
    workspaceId: WorkspaceId.create('ws-1'),
    displayName,
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
    expect(screen.getByRole('button', { name: 'Back to boards' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Session timer' })).toBeInTheDocument();
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

  it('identifies collaborators by display name and falls back to the short id', () => {
    render(
      <WorkspaceTopBar
        workspace={WORKSPACE}
        role={undefined}
        onBack={jest.fn()}
        syncStatus="idle"
        connectionStatus="connected"
        connectedUsers={[
          presenceOf('user-2', 'Ada Lovelace'),
          presenceOf('abcdefghijklmnop', null),
        ]}
        userColors={
          new Map([
            ['user-2', '#111111'],
            ['abcdefghijklmnop', '#222222'],
          ])
        }
        currentUser={CURRENT_USER}
        logoutUser={LOGOUT_USER}
        persistenceErrorMessage={null}
        collaborationErrorMessage={null}
        creationErrorMessage={null}
      />,
    );

    expect(screen.getByTestId('presence-avatar-user-2')).toHaveAttribute(
      'aria-label',
      'Ada Lovelace',
    );
    expect(screen.getByTestId('presence-avatar-abcdefghijklmnop')).toHaveAttribute(
      'aria-label',
      'ijklmnop',
    );
    expect(screen.getByTestId('presence-avatar-user-2')).toHaveAttribute(
      'data-user-color',
      '#111111',
    );
    expect(screen.getByTestId('presence-avatar-abcdefghijklmnop')).toHaveAttribute(
      'data-user-color',
      '#222222',
    );
  });

  it('lists every collaborator with their name and short id', async () => {
    render(
      <WorkspaceTopBar
        workspace={WORKSPACE}
        role={undefined}
        onBack={jest.fn()}
        syncStatus="idle"
        connectionStatus="connected"
        connectedUsers={[
          presenceOf('user-2', 'Ada Lovelace'),
          presenceOf('abcdefghijklmnop', null),
        ]}
        currentUser={CURRENT_USER}
        logoutUser={LOGOUT_USER}
        persistenceErrorMessage={null}
        collaborationErrorMessage={null}
        creationErrorMessage={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Show list/ }));

    expect(await screen.findByText('Connected people')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('ID user-2')).toBeInTheDocument();
    expect(screen.getByText('ijklmnop')).toBeInTheDocument();
    expect(screen.queryByText('ID ijklmnop')).not.toBeInTheDocument();
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

    const share = screen.getByRole('button', { name: 'Share' });
    expect(share).toHaveClass('rr-icon-button--ghost');
    fireEvent.click(share);
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

  it('toggles the task plan from the top bar', () => {
    const onTogglePlan = jest.fn();
    const { unmount } = render(
      <WorkspaceTopBar
        workspace={WORKSPACE}
        role="editor"
        onBack={jest.fn()}
        syncStatus="idle"
        connectionStatus="connected"
        connectedUsers={[]}
        currentUser={CURRENT_USER}
        logoutUser={LOGOUT_USER}
        planOpen={false}
        onTogglePlan={onTogglePlan}
        persistenceErrorMessage={null}
        collaborationErrorMessage={null}
        creationErrorMessage={null}
      />,
    );

    const toggle = screen.getByRole('button', { name: 'Task plan' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(onTogglePlan).toHaveBeenCalledTimes(1);
    unmount();

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
        planOpen
        onTogglePlan={onTogglePlan}
        persistenceErrorMessage={null}
        collaborationErrorMessage={null}
        creationErrorMessage={null}
      />,
    );

    expect(screen.getByRole('button', { name: 'Task plan' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('starts the presentation when frames are available', () => {
    const onPresent = jest.fn();

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
        onPresent={onPresent}
        canPresent
        persistenceErrorMessage={null}
        collaborationErrorMessage={null}
        creationErrorMessage={null}
      />,
    );

    const present = screen.getByRole('button', { name: 'Present' });
    expect(present).toBeEnabled();

    fireEvent.click(present);
    expect(onPresent).toHaveBeenCalledTimes(1);
  });

  it('disables the presentation when the board has no frames', () => {
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
        onPresent={jest.fn()}
        canPresent={false}
        persistenceErrorMessage={null}
        collaborationErrorMessage={null}
        creationErrorMessage={null}
      />,
    );

    expect(screen.getByRole('button', { name: 'Present' })).toBeDisabled();
  });

  it('opens the keyboard shortcuts help from the top bar', () => {
    const onShowShortcuts = jest.fn();
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
        onShowShortcuts={onShowShortcuts}
        persistenceErrorMessage={null}
        collaborationErrorMessage={null}
        creationErrorMessage={null}
      />,
    );

    const helpButton = screen.getByRole('button', { name: 'Keyboard shortcuts' });
    expect(helpButton).toHaveAttribute('aria-keyshortcuts', '?');

    fireEvent.click(helpButton);

    expect(onShowShortcuts).toHaveBeenCalledTimes(1);
  });

  it('exposes JSON and PDF export actions to viewers', async () => {
    const onExportJson = jest.fn();
    const onExportPdf = jest.fn();

    render(
      <WorkspaceTopBar
        workspace={WORKSPACE}
        role="viewer"
        onBack={jest.fn()}
        syncStatus="idle"
        connectionStatus="connected"
        connectedUsers={[]}
        currentUser={CURRENT_USER}
        logoutUser={LOGOUT_USER}
        onExportJson={onExportJson}
        onExportPdf={onExportPdf}
        persistenceErrorMessage={null}
        collaborationErrorMessage={null}
        creationErrorMessage={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export board' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Export as JSON' }));
    expect(onExportJson).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Export board' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Export as PDF' }));
    expect(onExportPdf).toHaveBeenCalledTimes(1);
  });

  it('hides the export action when no handlers are wired', () => {
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

    expect(screen.queryByRole('button', { name: 'Export board' })).not.toBeInTheDocument();
  });

  it('announces export errors next to the other board errors', () => {
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
        exportErrorMessage="We could not export the board. Try again."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not export the board. Try again.',
    );
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

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent('Not saved.');
    expect(alerts[0]).toHaveTextContent('Out of sync.');
  });

  it('does not offer inline renaming in the top bar', () => {
    render(
      <WorkspaceTopBar
        workspace={WORKSPACE}
        role="owner"
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
    expect(screen.queryByRole('button', { name: 'Rename workspace' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Workspace name' })).not.toBeInTheDocument();
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
