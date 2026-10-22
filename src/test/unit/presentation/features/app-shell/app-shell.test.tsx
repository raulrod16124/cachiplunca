import { fireEvent, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render as renderWithTheme } from '../../../../setup/render-with-theme';
import type { LogoutUser } from '../../../../../application/commands';
import type { AuthUser } from '../../../../../application/ports';
import { AppShell } from '../../../../../presentation/features/app-shell/app-shell';

function render(
  ui: ReactElement,
  initialEntries: string[] = ['/workspaces'],
): ReturnType<typeof renderWithTheme> {
  return renderWithTheme(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

const CURRENT_USER: AuthUser = {
  uid: 'user-1',
  email: 'ada@example.com',
  emailVerified: true,
  displayName: 'Ada Lovelace',
};

describe('AppShell', () => {
  const logoutUser: LogoutUser = jest.fn(async () => ({ status: 'ok' as const }));

  it('renders the brand, navigation and account identity', () => {
    render(
      <AppShell currentUser={CURRENT_USER} logoutUser={logoutUser} onCreateWorkspace={jest.fn()}>
        <p>Content</p>
      </AppShell>,
    );

    expect(screen.getByText('Cachiplunca')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Workspaces' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByRole('link', { name: 'Invitations' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('button', { name: 'Open navigation menu' })).not.toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders the notifications slot in the shell header', () => {
    render(
      <AppShell
        currentUser={CURRENT_USER}
        logoutUser={logoutUser}
        onCreateWorkspace={jest.fn()}
        notifications={<button type="button">Notifications</button>}
      >
        <p>Content</p>
      </AppShell>,
    );

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('marks the profile link as current on the profile route', () => {
    render(
      <AppShell currentUser={CURRENT_USER} logoutUser={logoutUser} onCreateWorkspace={jest.fn()}>
        <p>Content</p>
      </AppShell>,
      ['/profile'],
    );

    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Workspaces' })).not.toHaveAttribute('aria-current');
  });

  it('forwards the new workspace action', () => {
    const onCreateWorkspace = jest.fn();
    render(
      <AppShell
        currentUser={CURRENT_USER}
        logoutUser={logoutUser}
        onCreateWorkspace={onCreateWorkspace}
      >
        <p>Content</p>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'New workspace' }));
    expect(onCreateWorkspace).toHaveBeenCalledTimes(1);
  });
});
