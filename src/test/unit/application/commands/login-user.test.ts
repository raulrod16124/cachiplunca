import { createLoginUser, validateLoginInput } from '../../../../application/commands';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeAuthPort } from '../../../fixtures/fake-auth-port';

const CREDENTIALS = { email: 'user@example.com', password: 'secret123' };

describe('validateLoginInput', () => {
  it('returns no errors for valid input', () => {
    expect(validateLoginInput(CREDENTIALS)).toEqual({});
  });

  it('reports both fields when both are empty', () => {
    const errors = validateLoginInput({ email: '   ', password: '' });
    expect(errors.email).toBe('Enter your email address.');
    expect(errors.password).toBe('Enter your password.');
  });

  it('rejects malformed emails', () => {
    const errors = validateLoginInput({ ...CREDENTIALS, email: 'not-an-email' });
    expect(errors.email).toBe('Enter a valid email address.');
    expect(errors.password).toBeUndefined();
  });

  it('does not enforce a minimum length on an existing password', () => {
    expect(validateLoginInput({ ...CREDENTIALS, password: 'abc' })).toEqual({});
  });
});

describe('createLoginUser', () => {
  it('signs in a registered user and trims the email', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);
    await authPort.signOut();
    const loginUser = createLoginUser(authPort);

    const result = await loginUser({ email: '  user@example.com  ', password: 'secret123' });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.user.email).toBe('user@example.com');
    }
  });

  it('does not call the port when input is invalid', async () => {
    const authPort = new FakeAuthPort();
    const signIn = jest.spyOn(authPort, 'signIn');
    const loginUser = createLoginUser(authPort);

    const result = await loginUser({ email: 'bad', password: '' });

    expect(result.status).toBe('invalid-input');
    if (result.status === 'invalid-input') {
      expect(result.fieldErrors.email).toBeDefined();
      expect(result.fieldErrors.password).toBeDefined();
    }
    expect(signIn).not.toHaveBeenCalled();
  });

  it('rejects a wrong password without authenticating', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);
    await authPort.signOut();
    const loginUser = createLoginUser(authPort);

    const result = await loginUser({ email: CREDENTIALS.email, password: 'wrong-password' });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('authorization');
      expect(result.error.code).toBe(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }
  });

  it('rejects an unknown account', async () => {
    const authPort = new FakeAuthPort();
    const loginUser = createLoginUser(authPort);

    const result = await loginUser({ email: 'missing@example.com', password: 'secret123' });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.code).toBe(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }
  });

  it('preserves AppErrors thrown by the port', async () => {
    const authPort = new FakeAuthPort();
    jest.spyOn(authPort, 'signIn').mockRejectedValue({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
      message: 'Network request failed.',
    });
    const loginUser = createLoginUser(authPort);

    const result = await loginUser(CREDENTIALS);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('network');
      expect(result.error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
    }
  });

  it('normalizes unexpected errors into AppError', async () => {
    const authPort = new FakeAuthPort();
    jest.spyOn(authPort, 'signIn').mockRejectedValue(new Error('socket hang up'));
    const loginUser = createLoginUser(authPort);

    const result = await loginUser(CREDENTIALS);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    }
  });
});
