import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { render } from '../../../../setup/render-with-theme';
import type { LogoutUser } from '../../../../../application/commands';
import type { AuthUser } from '../../../../../application/ports';
import { createAppError, ERROR_CODES } from '../../../../../shared/errors';
import { AccountMenu } from '../../../../../presentation/features/auth/account-menu';

const CURRENT_USER: AuthUser = {
  uid: 'user-1',
  email: 'ada@example.com',
  emailVerified: true,
  displayName: 'Ada Lovelace',
};

function LocationProbe(): ReactNode {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderMenu(
  currentUser: AuthUser | null,
  logoutUser: LogoutUser,
): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/workspaces']}>
      <AccountMenu currentUser={currentUser} logoutUser={logoutUser} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('AccountMenu', () => {
  it('reveals the account identity and signs out on selection', async () => {
    const logoutUser: LogoutUser = jest.fn(async () => ({ status: 'ok' as const }));
    renderMenu(CURRENT_USER, logoutUser);

    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => expect(logoutUser).toHaveBeenCalledTimes(1));
  });

  it('falls back to the account label without exposing the email', async () => {
    const logoutUser: LogoutUser = jest.fn(async () => ({ status: 'ok' as const }));
    renderMenu({ ...CURRENT_USER, displayName: null }, logoutUser);

    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));

    expect(await screen.findByText('Your account')).toBeInTheDocument();
    expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument();
  });

  it('stays usable when no session user is available', async () => {
    const logoutUser: LogoutUser = jest.fn(async () => ({ status: 'ok' as const }));
    renderMenu(null, logoutUser);

    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => expect(logoutUser).toHaveBeenCalledTimes(1));
  });

  it('reports a controlled error when sign out fails', async () => {
    const logoutUser: LogoutUser = jest.fn(async () => ({
      status: 'error' as const,
      error: createAppError(
        'network',
        ERROR_CODES.NETWORK_REQUEST_FAILED,
        'The network connection was lost.',
      ),
    }));
    renderMenu(CURRENT_USER, logoutUser);

    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not reach the server. Check your connection and try again.',
    );
  });

  it('navigates to the profile page from the account menu', async () => {
    const logoutUser: LogoutUser = jest.fn(async () => ({ status: 'ok' as const }));
    renderMenu(CURRENT_USER, logoutUser);

    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Profile' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/profile'));
  });

  it('deep-links to the preferences tab from the account menu', async () => {
    const logoutUser: LogoutUser = jest.fn(async () => ({ status: 'ok' as const }));
    renderMenu(CURRENT_USER, logoutUser);

    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Preferences' }));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/profile?tab=preferences'),
    );
  });
});
