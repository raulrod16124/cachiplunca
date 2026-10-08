import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  createLoginUser,
  createLogoutUser,
  createRegisterUser,
} from '../../../../../application/commands';
import type { AuthUser } from '../../../../../application/ports';
import type { AuthFlowProps } from '../../../../../presentation/features/auth/auth-flow';
import { AuthFlow } from '../../../../../presentation/features/auth/auth-flow';
import { createAppError, ERROR_CODES } from '../../../../../shared/errors';
import { FakeAuthPort } from '../../../../fixtures/fake-auth-port';

const CREDENTIALS = { email: 'user@example.com', password: 'secret123' };

async function registeredUser(authPort: FakeAuthPort): Promise<void> {
  await authPort.signUp(CREDENTIALS);
  await authPort.signOut();
}

function renderAuthFlow(authPort: FakeAuthPort, overrides: Partial<AuthFlowProps> = {}): void {
  render(
    <AuthFlow
      registerUser={createRegisterUser(authPort)}
      loginUser={createLoginUser(authPort)}
      logoutUser={createLogoutUser(authPort)}
      {...overrides}
    />,
  );
}

function fillForm(email: string, password: string): void {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
}

async function signIn(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  fillForm(CREDENTIALS.email, CREDENTIALS.password);
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('heading', { name: 'You are signed in' })).toBeInTheDocument();
}

describe('AuthFlow', () => {
  it('opens on the sign-up form and toggles between both forms', () => {
    renderAuthFlow(new FakeAuthPort());

    expect(
      screen.getByRole('heading', { level: 1, name: 'Create your account' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Create your account' }),
    ).toBeInTheDocument();
  });

  it('opens the authenticated state with valid credentials', async () => {
    const authPort = new FakeAuthPort();
    await registeredUser(authPort);
    renderAuthFlow(authPort);

    await signIn();

    expect(screen.getByText(`${CREDENTIALS.email} is ready to plan.`)).toBeInTheDocument();
  });

  it('opens the authenticated state after registering', async () => {
    renderAuthFlow(new FakeAuthPort());

    fillForm(CREDENTIALS.email, CREDENTIALS.password);
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('heading', { name: 'You are signed in' })).toBeInTheDocument();
  });

  it('signs out, clears the session and returns to the sign-in form', async () => {
    const authPort = new FakeAuthPort();
    await registeredUser(authPort);
    const sessions: Array<AuthUser | null> = [];
    authPort.observeSession((user) => sessions.push(user));
    renderAuthFlow(authPort);

    await signIn();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(sessions.at(-1)).toBeNull();
  });

  it('keeps the authenticated state and reports the error when signing out fails', async () => {
    const authPort = new FakeAuthPort();
    await registeredUser(authPort);
    const logoutUser = jest.fn(async () => ({
      status: 'error' as const,
      error: createAppError(
        'network',
        ERROR_CODES.NETWORK_REQUEST_FAILED,
        'The network connection was lost.',
      ),
    }));
    renderAuthFlow(authPort, { logoutUser });

    await signIn();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not reach the server. Check your connection and try again.',
    );
    expect(screen.getByRole('heading', { name: 'You are signed in' })).toBeInTheDocument();
    await waitFor(() => expect(logoutUser).toHaveBeenCalledTimes(1));
  });
});
