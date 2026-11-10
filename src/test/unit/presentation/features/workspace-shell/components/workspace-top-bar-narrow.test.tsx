import { fireEvent, screen } from '@testing-library/react';
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

const WORKSPACE = Workspace.create({
  id: WorkspaceId.create('ws-1'),
  name: 'Roadmap Q4',
  createdBy: UserId.create('user-1'),
});

const CURRENT_USER: AuthUser = {
  uid: 'user-1',
  email: 'ada@example.com',
  emailVerified: true,
  displayName: 'Ada Lovelace',
};

const logoutUser: LogoutUser = jest.fn(async () => ({ status: 'ok' as const }));

function presenceOf(userId: string, displayName: string | null = null): Presence {
  return Presence.create({
    userId: UserId.create(userId),
    workspaceId: WorkspaceId.create('ws-1'),
    displayName,
  });
}

let viewportWidth = 390;

function createMediaQueryList(query: string): MediaQueryList {
  const maxWidth = /max-width:\s*(\d+)px/.exec(query);
  const matches = maxWidth === null ? false : viewportWidth <= Number(maxWidth[1]);

  return {
    matches,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  } as unknown as MediaQueryList;
}

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: jest.fn((query: string) => createMediaQueryList(query)),
  });
});

beforeEach(() => {
  viewportWidth = 390;
  jest.clearAllMocks();
});

function renderTopBar(
  overrides: Partial<Parameters<typeof WorkspaceTopBar>[0]> = {},
): ReturnType<typeof render> {
  return render(
    <WorkspaceTopBar
      workspace={WORKSPACE}
      role="editor"
      onBack={jest.fn()}
      syncStatus="idle"
      connectionStatus="connected"
      connectedUsers={[]}
      currentUser={CURRENT_USER}
      logoutUser={logoutUser}
      persistenceErrorMessage={null}
      collaborationErrorMessage={null}
      creationErrorMessage={null}
      {...overrides}
    />,
  );
}

describe('WorkspaceTopBar narrow viewport', () => {
  it('keeps primary actions visible and moves secondary actions into a menu', () => {
    renderTopBar({
      onShare: jest.fn(),
      onTogglePlan: jest.fn(),
      onToggleComments: jest.fn(),
      onPresent: jest.fn(),
      onShowShortcuts: jest.fn(),
      onExportJson: jest.fn(),
      onExportPdf: jest.fn(),
      canPresent: true,
    });

    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Task plan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comments' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More board actions' })).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: 'Present' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export board' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Keyboard shortcuts' })).not.toBeInTheDocument();
  });

  it('forwards secondary actions from the overflow menu', async () => {
    const onPresent = jest.fn();
    const onShowShortcuts = jest.fn();
    const onExportJson = jest.fn();
    const onExportPdf = jest.fn();

    renderTopBar({
      onPresent,
      onShowShortcuts,
      onExportJson,
      onExportPdf,
      canPresent: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'More board actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Present' }));
    fireEvent.click(screen.getByRole('button', { name: 'More board actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Export as JSON' }));
    fireEvent.click(screen.getByRole('button', { name: 'More board actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Export as PDF' }));
    fireEvent.click(screen.getByRole('button', { name: 'More board actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Keyboard shortcuts' }));

    expect(onPresent).toHaveBeenCalledTimes(1);
    expect(onExportJson).toHaveBeenCalledTimes(1);
    expect(onExportPdf).toHaveBeenCalledTimes(1);
    expect(onShowShortcuts).toHaveBeenCalledTimes(1);
  });

  it('disables presentation in the menu when there are no frames', async () => {
    renderTopBar({ onPresent: jest.fn(), canPresent: false });

    fireEvent.click(screen.getByRole('button', { name: 'More board actions' }));

    expect(await screen.findByRole('menuitem', { name: 'Present' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('omits the overflow menu when there are no secondary actions', () => {
    renderTopBar();

    expect(screen.queryByRole('button', { name: 'More board actions' })).not.toBeInTheDocument();
  });
});

describe('WorkspaceTopBar responsive density', () => {
  it('keeps labels and secondary actions inline on wide viewports', () => {
    viewportWidth = 1400;

    renderTopBar({
      connectedUsers: [presenceOf('user-2', 'Ada Lovelace'), presenceOf('user-3', 'Grace Hopper')],
      onShare: jest.fn(),
      onTogglePlan: jest.fn(),
      onToggleComments: jest.fn(),
      onPresent: jest.fn(),
      onShowShortcuts: jest.fn(),
      onExportJson: jest.fn(),
      onExportPdf: jest.fn(),
      canPresent: true,
    });

    expect(screen.getByText('2 connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share' })).toHaveClass('rr-button--primary');
    expect(screen.getByRole('button', { name: 'Present' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export board' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More board actions' })).not.toBeInTheDocument();
  });

  it('collapses labels and secondary actions on compact viewports', () => {
    viewportWidth = 1100;

    renderTopBar({
      connectedUsers: [presenceOf('user-2', 'Ada Lovelace'), presenceOf('user-3', 'Grace Hopper')],
      onShare: jest.fn(),
      onTogglePlan: jest.fn(),
      onToggleComments: jest.fn(),
      onPresent: jest.fn(),
      onShowShortcuts: jest.fn(),
      onExportJson: jest.fn(),
      onExportPdf: jest.fn(),
      canPresent: true,
    });

    expect(screen.getByTestId('connected-users')).toBeInTheDocument();
    expect(screen.queryByText('2 connected')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share' })).toHaveClass('rr-icon-button--primary');
    expect(screen.getByRole('button', { name: 'More board actions' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Present' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export board' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Keyboard shortcuts' })).not.toBeInTheDocument();
  });

  it('omits the overflow menu on compact viewports without secondary actions', () => {
    viewportWidth = 1100;

    renderTopBar();

    expect(screen.queryByRole('button', { name: 'More board actions' })).not.toBeInTheDocument();
  });
});
