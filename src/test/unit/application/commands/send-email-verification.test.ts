import { createSendEmailVerification } from '../../../../application/commands';
import { createAppError, ERROR_CODES } from '../../../../shared/errors';
import { FakeAuthPort } from '../../../fixtures/fake-auth-port';

describe('createSendEmailVerification', () => {
  it('delegates to the auth port', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp({ email: 'user@example.com', password: 'secret123' });
    const spy = jest.spyOn(authPort, 'sendEmailVerification');
    const sendEmailVerification = createSendEmailVerification(authPort);

    await expect(sendEmailVerification()).resolves.toEqual({ status: 'ok' });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('maps failures into an AppError result', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp({ email: 'user@example.com', password: 'secret123' });
    jest
      .spyOn(authPort, 'sendEmailVerification')
      .mockRejectedValue(createAppError('network', ERROR_CODES.NETWORK_REQUEST_FAILED, 'offline'));
    const sendEmailVerification = createSendEmailVerification(authPort);

    await expect(sendEmailVerification()).resolves.toMatchObject({
      status: 'error',
      error: { code: ERROR_CODES.NETWORK_REQUEST_FAILED },
    });
  });
});
