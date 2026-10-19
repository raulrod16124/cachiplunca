import { fireEvent, screen } from '@testing-library/react';
import { render } from '../../../../setup/render-with-theme';
import type { LogoutUser } from '../../../../../application/commands';
import type { AuthUser } from '../../../../../application/ports';
import { AppShell } from '../../../../../presentation/features/app-shell/app-shell';

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
    expect(screen.getByRole('link', { name: 'Workspaces' })).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
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
