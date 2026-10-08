import { fireEvent, render, screen } from '@testing-library/react';
import { createRegisterUser, type RegisterUserResult } from '../../../../../application/commands';
import { RegisterForm } from '../../../../../presentation/features/auth/register-form';
import { createAppError, ERROR_CODES } from '../../../../../shared/errors';
import type { AuthUser } from '../../../../../application/ports';
import { FakeAuthPort } from '../../../../fixtures/fake-auth-port';

const REGISTERED_USER: AuthUser = {
  uid: 'uid-1',
  email: 'new@example.com',
  emailVerified: false,
  displayName: null,
};

function fillForm(email: string, password: string): void {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
}

function submit(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
}

describe('RegisterForm', () => {
  it('renders labelled fields and a submit button', () => {
    render(<RegisterForm registerUser={createRegisterUser(new FakeAuthPort())} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Create your account' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });

  it('shows accessible field errors for invalid input without calling the port', async () => {
    const authPort = new FakeAuthPort();
    const signUp = jest.spyOn(authPort, 'signUp');
    render(<RegisterForm registerUser={createRegisterUser(authPort)} />);

    submit();

    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Choose a password.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(signUp).not.toHaveBeenCalled();
  });

  it('registers a valid user and reports success', async () => {
    const onRegistered = jest.fn();
    render(
      <RegisterForm
        registerUser={createRegisterUser(new FakeAuthPort())}
        onRegistered={onRegistered}
      />,
    );

    fillForm('new@example.com', 'secret123');
    submit();

    expect(await screen.findByRole('heading', { name: 'Account created' })).toBeInTheDocument();
    expect(onRegistered).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@example.com' }),
    );
  });

  it('shows a friendly message when the email is already registered', async () => {
    const authPort = new FakeAuthPort();
    await createRegisterUser(authPort)({ email: 'taken@example.com', password: 'secret123' });
    render(<RegisterForm registerUser={createRegisterUser(authPort)} />);

    fillForm('taken@example.com', 'secret123');
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email already exists. Try signing in instead.',
    );
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
  });

  it('shows a friendly message when the port reports a network error', async () => {
    const registerUser = jest.fn(async (): Promise<RegisterUserResult> => ({
      status: 'error',
      error: createAppError(
        'network',
        ERROR_CODES.NETWORK_REQUEST_FAILED,
        'The network connection was lost.',
      ),
    }));
    render(<RegisterForm registerUser={registerUser} />);

    fillForm('new@example.com', 'secret123');
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not reach the server. Check your connection and try again.',
    );
  });

  it('disables the submit button while the request is in flight', async () => {
    let resolveRequest!: (result: RegisterUserResult) => void;
    const pending = new Promise<RegisterUserResult>((resolve) => {
      resolveRequest = resolve;
    });
    const registerUser = jest.fn(() => pending);
    render(<RegisterForm registerUser={registerUser} />);

    fillForm('new@example.com', 'secret123');
    submit();

    const button = screen.getByRole('button', { name: 'Create account' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    resolveRequest({ status: 'ok', user: REGISTERED_USER });

    expect(await screen.findByRole('heading', { name: 'Account created' })).toBeInTheDocument();
    expect(registerUser).toHaveBeenCalledTimes(1);
  });
});
