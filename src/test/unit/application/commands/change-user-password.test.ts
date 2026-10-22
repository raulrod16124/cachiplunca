import {
  createChangeUserPassword,
  validateChangeUserPasswordInput,
} from '../../../../application/commands';
import { FakeAuthPort } from '../../../fixtures/fake-auth-port';

const CREDENTIALS = { email: 'ada@example.com', password: 'secret123', displayName: 'Ada' };

describe('change user password', () => {
  it('changes the password when the current one is valid', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);

    const result = await createChangeUserPassword(authPort)({
      currentPassword: CREDENTIALS.password,
      newPassword: 'new-secret',
      confirmPassword: 'new-secret',
    });

    expect(result).toEqual({ status: 'ok' });
    await expect(
      authPort.signIn({ email: CREDENTIALS.email, password: 'new-secret' }),
    ).resolves.toBeTruthy();
  });

  it('requires a current password, a long enough new one and a confirmation', () => {
    expect(
      validateChangeUserPasswordInput({
        currentPassword: '',
        newPassword: '123',
        confirmPassword: '456',
      }),
    ).toEqual({
      currentPassword: 'Enter your current password.',
      newPassword: 'Password must be at least 6 characters.',
      confirmPassword: 'Passwords do not match.',
    });
  });

  it('reports a friendly error when the current password is wrong', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp(CREDENTIALS);

    const result = await createChangeUserPassword(authPort)({
      currentPassword: 'wrong-password',
      newPassword: 'new-secret',
      confirmPassword: 'new-secret',
    });

    expect(result.status).toBe('error');
  });
});
