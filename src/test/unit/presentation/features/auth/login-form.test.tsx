import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createLoginUser, type LoginUserResult } from '../../../../../application/commands';
import type { AuthUser } from '../../../../../application/ports';
import { LoginForm } from '../../../../../presentation/features/auth/login-form';
import { createAppError, ERROR_CODES } from '../../../../../shared/errors';
import { FakeAuthPort } from '../../../../fixtures/fake-auth-port';

const CREDENTIALS = { email: 'user@example.com', password: 'secret123' };

function fillForm(email: string, password: string): void {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
}

function submit(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginForm', () => {
  it('renders labelled fields and a submit button', () => {
    render(<LoginForm loginUser={createLoginUser(new FakeAuthPort())} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows accessible field errors for invalid input without calling the port', async () => {
    const authPort = new FakeAuthPort();
    const signIn = jest.spyOn(authPort, 'signIn');
    render(<LoginForm loginUser={createLoginUser(authPort)} />);

    submit();

    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('signs in with valid credentials and reports the user', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);
    await authPort.signOut();
    const onLoggedIn = jest.fn();
    render(<LoginForm loginUser={createLoginUser(authPort)} onLoggedIn={onLoggedIn} />);

    fillForm(CREDENTIALS.email, CREDENTIALS.password);
    submit();

    await waitFor(() =>
      expect(onLoggedIn).toHaveBeenCalledWith(
        expect.objectContaining({ email: CREDENTIALS.email }),
      ),
    );
  });

  it('shows a friendly message when the credentials are invalid', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);
    await authPort.signOut();
    render(<LoginForm loginUser={createLoginUser(authPort)} />);

    fillForm(CREDENTIALS.email, 'wrong-password');
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('shows a friendly message when the port reports a network error', async () => {
    const loginUser = jest.fn(async (): Promise<LoginUserResult> => ({
      status: 'error',
      error: createAppError(
        'network',
        ERROR_CODES.NETWORK_REQUEST_FAILED,
        'The network connection was lost.',
      ),
    }));
    render(<LoginForm loginUser={loginUser} />);

    fillForm(CREDENTIALS.email, CREDENTIALS.password);
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not reach the server. Check your connection and try again.',
    );
  });

  it('disables the submit button while the request is in flight', async () => {
    let resolveRequest!: (result: LoginUserResult) => void;
    const pending = new Promise<LoginUserResult>((resolve) => {
      resolveRequest = resolve;
    });
    const loginUser = jest.fn(() => pending);
    const onLoggedIn = jest.fn();
    render(<LoginForm loginUser={loginUser} onLoggedIn={onLoggedIn} />);

    fillForm(CREDENTIALS.email, CREDENTIALS.password);
    submit();

    const button = screen.getByRole('button', { name: 'Sign in' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    const user: AuthUser = {
      uid: 'uid-1',
      email: CREDENTIALS.email,
      emailVerified: false,
      displayName: null,
    };
    resolveRequest({ status: 'ok', user });

    expect(loginUser).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith(user));
  });
});
