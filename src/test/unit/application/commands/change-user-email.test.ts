import {
  createChangeUserEmail,
  validateChangeUserEmailInput,
} from '../../../../application/commands';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeAuthPort } from '../../../fixtures/fake-auth-port';

const CREDENTIALS = { email: 'ada@example.com', password: 'secret123' };

describe('change user email', () => {
  it('updates the email after confirming the current password', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);

    const result = await createChangeUserEmail(authPort)({
      email: 'grace@example.com',
      currentPassword: CREDENTIALS.password,
    });

    expect(result).toEqual({
      status: 'ok',
      user: expect.objectContaining({ email: 'grace@example.com' }),
    });
    await expect(
      authPort.signIn({ email: 'grace@example.com', password: CREDENTIALS.password }),
    ).resolves.toEqual(expect.objectContaining({ email: 'grace@example.com' }));
  });

  it('validates the new email and the current password', () => {
    expect(validateChangeUserEmailInput({ email: 'nope', currentPassword: '' })).toEqual({
      email: 'Enter a valid email address.',
      currentPassword: 'Enter your current password.',
    });
    expect(validateChangeUserEmailInput({ email: '', currentPassword: '' })).toEqual({
      email: 'Enter your new email address.',
      currentPassword: 'Enter your current password.',
    });
  });

  it('reports invalid credentials without changing the email', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);

    const result = await createChangeUserEmail(authPort)({
      email: 'grace@example.com',
      currentPassword: 'wrong-password',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.code).toBe(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }
    await expect(
      authPort.signIn({ email: CREDENTIALS.email, password: CREDENTIALS.password }),
    ).resolves.toBeTruthy();
  });
});
