import { createLogoutUser } from '../../../../application/commands';
import type { AuthUser } from '../../../../application/ports';
import { ERROR_CODES } from '../../../../shared/errors';
import { FakeAuthPort } from '../../../fixtures/fake-auth-port';

function observeSessions(authPort: FakeAuthPort): Array<AuthUser | null> {
  const sessions: Array<AuthUser | null> = [];
  authPort.observeSession((user) => sessions.push(user));
  return sessions;
}

describe('createLogoutUser', () => {
  it('clears the active session', async () => {
    const authPort = new FakeAuthPort();
    await authPort.signUp({ email: 'user@example.com', password: 'secret123' });
    const sessions = observeSessions(authPort);
    const logoutUser = createLogoutUser(authPort);

    const result = await logoutUser();

    expect(result.status).toBe('ok');
    expect(sessions.at(-1)).toBeNull();
  });

  it('preserves AppErrors thrown by the port', async () => {
    const authPort = new FakeAuthPort();
    jest.spyOn(authPort, 'signOut').mockRejectedValue({
      kind: 'network',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
      message: 'Network request failed.',
    });
    const logoutUser = createLogoutUser(authPort);

    const result = await logoutUser();

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('network');
      expect(result.error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
    }
  });

  it('normalizes unexpected errors into AppError', async () => {
    const authPort = new FakeAuthPort();
    jest.spyOn(authPort, 'signOut').mockRejectedValue(new Error('socket hang up'));
    const logoutUser = createLogoutUser(authPort);

    const result = await logoutUser();

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_UNEXPECTED);
    }
  });
});
