import { createRefreshUser } from '../../../../application/commands';
import { createAppError, ERROR_CODES } from '../../../../shared/errors';
import { FakeAuthPort } from '../../../fixtures/fake-auth-port';

describe('createRefreshUser', () => {
  it('returns the refreshed user from the auth port', async () => {
    const authPort = new FakeAuthPort();
    const user = await authPort.signUp({ email: 'user@example.com', password: 'secret123' });
    const refreshUser = createRefreshUser(authPort);

    await expect(refreshUser()).resolves.toEqual({ status: 'ok', user });
  });

  it('maps failures into an AppError result', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp({ email: 'user@example.com', password: 'secret123' });
    jest
      .spyOn(authPort, 'refreshUser')
      .mockRejectedValue(createAppError('network', ERROR_CODES.NETWORK_REQUEST_FAILED, 'offline'));
    const refreshUser = createRefreshUser(authPort);

    await expect(refreshUser()).resolves.toMatchObject({
      status: 'error',
      error: { code: ERROR_CODES.NETWORK_REQUEST_FAILED },
    });
  });
});
