import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { LogoutUser } from '../../../../../application/commands';
import { SignOutButton } from '../../../../../presentation/features/auth/sign-out-button';
import { createAppError, ERROR_CODES } from '../../../../../shared/errors';

describe('SignOutButton', () => {
  it('calls logoutUser once when sign out succeeds', async () => {
    const logoutUser: LogoutUser = jest.fn(async () => ({ status: 'ok' as const }));
    render(<SignOutButton logoutUser={logoutUser} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(logoutUser).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reports a controlled error and keeps sign out available when it fails', async () => {
    const logoutUser: LogoutUser = jest.fn(async () => ({
      status: 'error' as const,
      error: createAppError(
        'network',
        ERROR_CODES.NETWORK_REQUEST_FAILED,
        'The network connection was lost.',
      ),
    }));
    render(<SignOutButton logoutUser={logoutUser} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not reach the server. Check your connection and try again.',
    );
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
    await waitFor(() => expect(logoutUser).toHaveBeenCalledTimes(1));
  });
});
