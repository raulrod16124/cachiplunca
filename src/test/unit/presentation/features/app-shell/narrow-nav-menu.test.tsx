import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { render } from '../../../../setup/render-with-theme';
import type { LogoutUser } from '../../../../../application/commands';
import type { AuthUser } from '../../../../../application/ports';
import { createAppError, ERROR_CODES } from '../../../../../shared/errors';
import { NarrowNavMenu } from '../../../../../presentation/features/app-shell/narrow-nav-menu';

const CURRENT_USER: AuthUser = {
  uid: 'user-1',
  email: 'ada@example.com',
  emailVerified: true,
  displayName: 'Ada Lovelace',
};

const logoutUser: LogoutUser = jest.fn(async () => ({ status: 'ok' as const }));

function createMediaQueryList(matches: boolean): MediaQueryList {
  return {
    matches,
    media: '(max-width: 900px)',
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  } as unknown as MediaQueryList;
}

let mediaQueryList = createMediaQueryList(true);

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: jest.fn(() => mediaQueryList),
  });
});

beforeEach(() => {
  mediaQueryList = createMediaQueryList(true);
});

function openMenu(): HTMLElement {
  const trigger = screen.getByRole('button', { name: 'Open navigation menu' });
  fireEvent.click(trigger);
  return trigger;
}

describe('NarrowNavMenu', () => {
  it('does not render the narrow trigger on wide viewports', () => {
    mediaQueryList = createMediaQueryList(false);
    render(
      <NarrowNavMenu
        currentUser={CURRENT_USER}
        logoutUser={logoutUser}
        onCreateWorkspace={jest.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Open navigation menu' })).not.toBeInTheDocument();
  });

  it('exposes a menu trigger wired to the dialog', () => {
    render(
      <NarrowNavMenu
        currentUser={CURRENT_USER}
        logoutUser={logoutUser}
        onCreateWorkspace={jest.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Open navigation menu' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the drawer with navigation, identity and account actions', () => {
    render(
      <NarrowNavMenu
        currentUser={CURRENT_USER}
        logoutUser={logoutUser}
        onCreateWorkspace={jest.fn()}
      />,
    );

    const trigger = openMenu();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const dialog = screen.getByRole('dialog', { name: 'Navigation' });
    expect(within(dialog).getByRole('navigation')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Workspaces' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(dialog).getByRole('link', { name: 'Invitations' })).not.toHaveAttribute(
      'aria-current',
    );
    expect(within(dialog).getByText('Ada Lovelace')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('exposes the pending invitations count in the drawer', () => {
    render(
      <NarrowNavMenu
        currentUser={CURRENT_USER}
        logoutUser={logoutUser}
        onCreateWorkspace={jest.fn()}
        pendingInvitationCount={3}
      />,
    );

    openMenu();
    const dialog = screen.getByRole('dialog', { name: 'Navigation' });
    expect(
      within(dialog).getByRole('link', { name: /Invitations, 3 pending/i }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('3')).toBeInTheDocument();
  });

  it('creates a workspace and closes the drawer', () => {
    const onCreateWorkspace = jest.fn();
    render(
      <NarrowNavMenu
        currentUser={CURRENT_USER}
        logoutUser={logoutUser}
        onCreateWorkspace={onCreateWorkspace}
      />,
    );

    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'New workspace' }));

    expect(onCreateWorkspace).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the drawer when navigating', () => {
    render(
      <NarrowNavMenu
        currentUser={CURRENT_USER}
        logoutUser={logoutUser}
        onCreateWorkspace={jest.fn()}
      />,
    );

    openMenu();
    fireEvent.click(screen.getByRole('link', { name: 'Invitations' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('signs out from the drawer', async () => {
    render(
      <NarrowNavMenu
        currentUser={CURRENT_USER}
        logoutUser={logoutUser}
        onCreateWorkspace={jest.fn()}
      />,
    );

    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(logoutUser).toHaveBeenCalledTimes(1));
  });

  it('reports a controlled error when sign out fails', async () => {
    const failingLogout: LogoutUser = jest.fn(async () => ({
      status: 'error' as const,
      error: createAppError(
        'network',
        ERROR_CODES.NETWORK_REQUEST_FAILED,
        'The network connection was lost.',
      ),
    }));

    render(
      <NarrowNavMenu
        currentUser={CURRENT_USER}
        logoutUser={failingLogout}
        onCreateWorkspace={jest.fn()}
      />,
    );

    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not reach the server. Check your connection and try again.',
    );
  });

  it('closes the drawer from the header close button', () => {
    render(
      <NarrowNavMenu
        currentUser={CURRENT_USER}
        logoutUser={logoutUser}
        onCreateWorkspace={jest.fn()}
      />,
    );

    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Close navigation menu' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
