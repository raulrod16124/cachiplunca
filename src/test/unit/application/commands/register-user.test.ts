import {
  createRegisterUser,
  validateRegisterInput,
  type RegisterUserResult,
} from '../../../../application/commands';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeAuthPort } from '../../../fixtures/fake-auth-port';

const VALID_INPUT = { email: 'user@example.com', password: 'secret123' };

describe('validateRegisterInput', () => {
  it('returns no errors for valid input', () => {
    expect(validateRegisterInput(VALID_INPUT)).toEqual({});
  });

  it('reports both fields when both are empty', () => {
    const errors = validateRegisterInput({ email: '   ', password: '' });
    expect(errors.email).toBe('Enter your email address.');
    expect(errors.password).toBe('Choose a password.');
  });

  it('rejects malformed emails', () => {
    const errors = validateRegisterInput({ ...VALID_INPUT, email: 'not-an-email' });
    expect(errors.email).toBe('Enter a valid email address.');
    expect(errors.password).toBeUndefined();
  });

  it('rejects passwords below the minimum length', () => {
    const errors = validateRegisterInput({ ...VALID_INPUT, password: 'abc' });
    expect(errors.password).toBe('Password must be at least 6 characters.');
    expect(errors.email).toBeUndefined();
  });
});

describe('createRegisterUser', () => {
  it('registers a valid user and trims the email', async () => {
    const authPort = new FakeAuthPort();
    const registerUser = createRegisterUser(authPort);

    const result = await registerUser({ email: '  user@example.com  ', password: 'secret123' });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.user.email).toBe('user@example.com');
      expect(result.user.uid).not.toBe('');
    }
  });

  it('does not call the port when input is invalid', async () => {
    const authPort = new FakeAuthPort();
    const signUp = jest.spyOn(authPort, 'signUp');
    const registerUser = createRegisterUser(authPort);

    const result = await registerUser({ email: 'bad', password: 'short' });

    expect(result.status).toBe('invalid-input');
    if (result.status === 'invalid-input') {
      expect(result.fieldErrors.email).toBeDefined();
      expect(result.fieldErrors.password).toBeDefined();
    }
    expect(signUp).not.toHaveBeenCalled();
  });

  it('reports a conflict when the email is already registered', async () => {
    const authPort = new FakeAuthPort();
    const registerUser = createRegisterUser(authPort);
    await registerUser(VALID_INPUT);

    const result = await registerUser(VALID_INPUT);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('conflict');
      expect(result.error.code).toBe(ERROR_CODES.AUTH_EMAIL_ALREADY_IN_USE);
    }
  });

  it('preserves AppErrors thrown by the port', async () => {
    const authPort = new FakeAuthPort();
    jest.spyOn(authPort, 'signUp').mockRejectedValue({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
      message: 'Network request failed.',
    });
    const registerUser = createRegisterUser(authPort);

    const result = await registerUser(VALID_INPUT);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('network');
      expect(result.error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
    }
  });

  it('normalizes unexpected errors into AppError', async () => {
    const authPort = new FakeAuthPort();
    jest.spyOn(authPort, 'signUp').mockRejectedValue(new Error('socket hang up'));
    const registerUser = createRegisterUser(authPort);

    const result: RegisterUserResult = await registerUser(VALID_INPUT);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    }
  });
});
